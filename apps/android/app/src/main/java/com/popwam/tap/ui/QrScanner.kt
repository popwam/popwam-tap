package com.popwam.tap.ui

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FlashlightOn
import androidx.compose.material.icons.filled.Image
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.popwam.tap.R
import java.util.concurrent.atomic.AtomicBoolean

@Composable fun QrScanner(onValue:(String)->Unit){
    val context=LocalContext.current
    var permission by remember{mutableStateOf(ContextCompat.checkSelfPermission(context,Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)}
    var torch by remember{mutableStateOf(false)}
    var error by remember{mutableStateOf(false)}
    val request=rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()){permission=it}
    val scanner=remember{BarcodeScanning.getClient(BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build())}
    DisposableEffect(Unit){onDispose{scanner.close()}}
    val imagePicker=rememberLauncherForActivityResult(ActivityResultContracts.GetContent()){uri:Uri?->
        if(uri!=null)runCatching{InputImage.fromFilePath(context,uri)}.onSuccess{image->scanner.process(image).addOnSuccessListener{codes->val value=codes.firstOrNull()?.rawValue;if(value==null)error=true else{error=false;onValue(value)}}.addOnFailureListener{error=true}}
    }
    Column(verticalArrangement=Arrangement.spacedBy(12.dp)){
        if(permission)Box(Modifier.fillMaxWidth().height(310.dp)){
            CameraPreview(scanner,torch,onValue)
            Box(Modifier.align(Alignment.Center).size(220.dp).border(2.dp,MaterialTheme.colorScheme.primary,RoundedCornerShape(24.dp)))
            FilledTonalIconButton({torch=!torch},Modifier.align(Alignment.BottomEnd).padding(12.dp)){Icon(Icons.Default.FlashlightOn,stringResource(R.string.flash))}
        } else {Text(stringResource(R.string.camera_permission_required));Button(onClick={request.launch(Manifest.permission.CAMERA)}){Text(stringResource(R.string.scan_camera))}}
        OutlinedButton(onClick={imagePicker.launch("image/*")},modifier=Modifier.fillMaxWidth()){Icon(Icons.Default.Image,null);Text(stringResource(R.string.choose_image))}
        if(error)Text(stringResource(R.string.qr_not_found),color=MaterialTheme.colorScheme.error)
    }
}

@Composable private fun CameraPreview(scanner:BarcodeScanner,torch:Boolean,onValue:(String)->Unit){
    val context=LocalContext.current;val lifecycle=LocalLifecycleOwner.current;val handled=remember{AtomicBoolean(false)}
    AndroidView(factory={PreviewView(it).apply{scaleType=PreviewView.ScaleType.FILL_CENTER}},modifier=Modifier.fillMaxSize(),update={view->
        val future=ProcessCameraProvider.getInstance(context)
        future.addListener({val provider=future.get();val preview=Preview.Builder().build().also{it.surfaceProvider=view.surfaceProvider};val analysis=ImageAnalysis.Builder().setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build();analysis.setAnalyzer(ContextCompat.getMainExecutor(context)){proxy->scanProxy(scanner,proxy){if(handled.compareAndSet(false,true))onValue(it)}};provider.unbindAll();runCatching{provider.bindToLifecycle(lifecycle,CameraSelector.DEFAULT_BACK_CAMERA,preview,analysis).cameraControl.enableTorch(torch)}},ContextCompat.getMainExecutor(context))
    })
}

@androidx.annotation.OptIn(ExperimentalGetImage::class) private fun scanProxy(scanner:BarcodeScanner,proxy:ImageProxy,onValue:(String)->Unit){val media=proxy.image;if(media==null){proxy.close();return};scanner.process(InputImage.fromMediaImage(media,proxy.imageInfo.rotationDegrees)).addOnSuccessListener{codes->codes.firstOrNull()?.rawValue?.let(onValue)}.addOnCompleteListener{proxy.close()}}
