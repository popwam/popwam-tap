package com.popwam.tap.ui

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
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

@Composable fun QrScanner(onValue:(String)->Unit){val context=LocalContext.current;var permission by remember{mutableStateOf(ContextCompat.checkSelfPermission(context,Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)};val request=rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()){permission=it};val scanner=remember{BarcodeScanning.getClient(BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build())};DisposableEffect(Unit){onDispose{scanner.close()}};val imagePicker=rememberLauncherForActivityResult(ActivityResultContracts.GetContent()){uri:Uri?->if(uri!=null)runCatching{InputImage.fromFilePath(context,uri)}.onSuccess{image->scanner.process(image).addOnSuccessListener{codes->codes.firstOrNull()?.rawValue?.let(onValue)}}};Column(verticalArrangement=Arrangement.spacedBy(12.dp)){if(permission)CameraPreview(scanner,onValue)else{Text(stringResource(R.string.camera_permission_required));Button(onClick={request.launch(Manifest.permission.CAMERA)}){Text(stringResource(R.string.scan_camera))}};OutlinedButton(onClick={imagePicker.launch("image/*")},modifier=Modifier.fillMaxWidth()){Text(stringResource(R.string.choose_image))}}}

@Composable private fun CameraPreview(scanner:BarcodeScanner,onValue:(String)->Unit){val context=LocalContext.current;val lifecycle=LocalLifecycleOwner.current;val handled=remember{AtomicBoolean(false)};AndroidView(factory={PreviewView(it).apply{scaleType=PreviewView.ScaleType.FILL_CENTER}},modifier=Modifier.fillMaxWidth().height(270.dp),update={view->val future=ProcessCameraProvider.getInstance(context);future.addListener({val provider=future.get();val preview=Preview.Builder().build().also{it.surfaceProvider=view.surfaceProvider};val analysis=ImageAnalysis.Builder().setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build();analysis.setAnalyzer(ContextCompat.getMainExecutor(context)){proxy->scanProxy(scanner,proxy){if(handled.compareAndSet(false,true))onValue(it)}};provider.unbindAll();runCatching{provider.bindToLifecycle(lifecycle,CameraSelector.DEFAULT_BACK_CAMERA,preview,analysis)}},ContextCompat.getMainExecutor(context))})}
@androidx.annotation.OptIn(ExperimentalGetImage::class) private fun scanProxy(scanner:BarcodeScanner,proxy:ImageProxy,onValue:(String)->Unit){val media=proxy.image;if(media==null){proxy.close();return};scanner.process(InputImage.fromMediaImage(media,proxy.imageInfo.rotationDegrees)).addOnSuccessListener{codes->codes.firstOrNull()?.rawValue?.let(onValue)}.addOnCompleteListener{proxy.close()}}
