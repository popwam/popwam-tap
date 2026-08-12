package com.popwam.pop.ui.share

import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import androidx.appcompat.content.res.AppCompatResources
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import com.popwam.pop.nfc.PermanentUrlPolicy
import com.popwam.pop.R
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object ShareQrPayloadPolicy {
    fun encodedText(payload: CanonicalSharePayload): String {
        require(PermanentUrlPolicy.isValid(payload.canonicalUrl))
        return payload.canonicalUrl
    }
}

object ShareQrRenderer {
    const val QUIET_ZONE_MODULES = 4

    fun render(canonicalUrl: String, size: Int = 900): Bitmap {
        require(size in 256..2048)
        require(PermanentUrlPolicy.isValid(canonicalUrl))
        val matrix = QRCodeWriter().encode(
            canonicalUrl,
            BarcodeFormat.QR_CODE,
            size,
            size,
            mapOf(
                EncodeHintType.CHARACTER_SET to "UTF-8",
                EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.M,
                EncodeHintType.MARGIN to QUIET_ZONE_MODULES,
            ),
        )
        val pixels = IntArray(size * size)
        for (y in 0 until size) for (x in 0 until size) {
            pixels[y * size + x] = if (matrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE
        }
        return Bitmap.createBitmap(pixels, size, size, Bitmap.Config.RGB_565)
    }

    /** Branded export frame. The encoded QR remains an untouched high-contrast square. */
    fun renderPresentation(context: Context, payload: CanonicalSharePayload, width: Int = 1080): Bitmap {
        require(width in 720..2048)
        val height = (width * 1.24f).toInt()
        val output = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        canvas.drawColor(Color.WHITE)
        paint.color = Color.rgb(109, 61, 215)
        canvas.drawRect(0f, 0f, width.toFloat(), width * .18f, paint)
        paint.color = Color.rgb(212, 175, 55)
        canvas.drawRect(0f, width * .18f, width.toFloat(), width * .195f, paint)

        val logoSize = (width * .12f).toInt()
        val logoLeft = (width - logoSize) / 2
        val logoTop = (width * .045f).toInt()
        paint.color = Color.WHITE
        canvas.drawCircle(width / 2f, logoTop + logoSize / 2f, logoSize * .56f, paint)
        AppCompatResources.getDrawable(context, R.drawable.pop_logo)?.let { logo ->
            logo.setBounds(logoLeft, logoTop, logoLeft + logoSize, logoTop + logoSize)
            logo.draw(canvas)
        }

        val qrSize = (width * .76f).toInt()
        val qr = render(payload.canonicalUrl, qrSize)
        val qrLeft = (width - qrSize) / 2f
        val qrTop = width * .27f
        paint.color = Color.WHITE
        canvas.drawRoundRect(qrLeft - 24f, qrTop - 24f, qrLeft + qrSize + 24f, qrTop + qrSize + 24f, 28f, 28f, paint)
        canvas.drawBitmap(qr, qrLeft, qrTop, null)

        paint.textAlign = Paint.Align.CENTER
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        paint.color = Color.rgb(27, 24, 36)
        paint.textSize = width * .046f
        canvas.drawText(payload.profileName.take(42), width / 2f, qrTop + qrSize + width * .10f, paint)
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
        paint.color = Color.rgb(82, 77, 94)
        paint.textSize = width * .026f
        canvas.drawText(payload.canonicalUrl.take(80), width / 2f, qrTop + qrSize + width * .155f, paint)
        return output
    }
}

sealed interface QrExportResult {
    data object Success : QrExportResult
    data object Unsupported : QrExportResult
    data object Failure : QrExportResult
}

object SharePlatform {
    fun copy(context: Context, payload: CanonicalSharePayload) {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText(payload.profileName, payload.canonicalUrl))
    }

    fun shareLink(context: Context, payload: CanonicalSharePayload, chooserTitle: String, arabic: Boolean) {
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, payload.profileName)
            putExtra(Intent.EXTRA_TITLE, payload.profileName)
            putExtra(Intent.EXTRA_TEXT, SharePayloadPolicy.nativeMessage(payload, arabic))
        }
        context.startActivity(Intent.createChooser(intent, chooserTitle))
    }

    fun shareWhatsApp(context: Context, payload: CanonicalSharePayload, arabic: Boolean) {
        val message = SharePayloadPolicy.nativeMessage(payload, arabic)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            setPackage("com.whatsapp")
            putExtra(Intent.EXTRA_TEXT, message)
        }
        runCatching { context.startActivity(intent) }.getOrElse {
            context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://wa.me/?text=${android.net.Uri.encode(message)}")))
        }
    }

    suspend fun shareQr(context: Context, payload: CanonicalSharePayload, bitmap: Bitmap, chooserTitle: String): QrExportResult = withContext(Dispatchers.IO) {
        runCatching {
            val directory = File(context.cacheDir, "shared").apply { mkdirs() }
            val file = File(directory, "${safeName(payload.profileName)}-qr.png")
            file.outputStream().use { output -> check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) }
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", file)
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, payload.profileName)
                putExtra(Intent.EXTRA_TEXT, payload.canonicalUrl)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            withContext(Dispatchers.Main) { context.startActivity(Intent.createChooser(intent, chooserTitle)) }
        }.fold({ QrExportResult.Success }, { QrExportResult.Failure })
    }

    suspend fun saveQr(context: Context, payload: CanonicalSharePayload, bitmap: Bitmap): QrExportResult = withContext(Dispatchers.IO) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return@withContext QrExportResult.Unsupported
        val resolver = context.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, "${safeName(payload.profileName)}-qr.png")
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            put(MediaStore.Images.Media.RELATIVE_PATH, "${Environment.DIRECTORY_PICTURES}/POP")
            put(MediaStore.Images.Media.IS_PENDING, 1)
        }
        val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: return@withContext QrExportResult.Failure
        try {
            resolver.openOutputStream(uri)?.use { output -> check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) }
                ?: error("QR_OUTPUT_UNAVAILABLE")
            resolver.update(uri, ContentValues().apply { put(MediaStore.Images.Media.IS_PENDING, 0) }, null, null)
            QrExportResult.Success
        } catch (_: Exception) {
            resolver.delete(uri, null, null)
            QrExportResult.Failure
        }
    }

    private fun safeName(value: String): String = value.lowercase()
        .replace(Regex("[^a-z0-9]+"), "-")
        .trim('-')
        .ifBlank { "pop-profile" }
        .take(48)
}
