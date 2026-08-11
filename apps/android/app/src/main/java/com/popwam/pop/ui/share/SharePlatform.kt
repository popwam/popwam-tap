package com.popwam.pop.ui.share

import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import com.popwam.pop.nfc.PermanentUrlPolicy
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
