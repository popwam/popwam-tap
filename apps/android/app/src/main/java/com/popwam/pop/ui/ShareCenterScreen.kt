package com.popwam.pop.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.nfc.NfcAdapter
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.popwam.pop.R
import com.popwam.pop.BuildConfig
import com.popwam.pop.data.api.ShareProductDto
import com.popwam.pop.data.api.ShareProductUpdateRequest
import com.popwam.pop.data.api.ShareTargetDto
import com.popwam.pop.hce.HceConfig
import com.popwam.pop.nfc.NfcCoordinator
import com.popwam.pop.nfc.PermanentUrlPolicy

private fun shareText(context:Context,url:String){
    val intent=Intent(Intent.ACTION_SEND).apply{type="text/plain";putExtra(Intent.EXTRA_TEXT,url)}
    context.startActivity(Intent.createChooser(intent,context.getString(R.string.share_native)))
}

private fun copyText(context:Context,url:String){
    (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
        .setPrimaryClip(ClipData.newPlainText(context.getString(R.string.share_link),url))
    showPopTransientToast(context,R.string.share_copied)
}

private fun qrBitmap(value:String,size:Int=760):Bitmap{
    val matrix=QRCodeWriter().encode(value,BarcodeFormat.QR_CODE,size,size)
    val pixels=IntArray(size*size)
    for(y in 0 until size)for(x in 0 until size)pixels[y*size+x]=if(matrix[x,y])android.graphics.Color.BLACK else android.graphics.Color.WHITE
    return Bitmap.createBitmap(pixels,size,size,Bitmap.Config.RGB_565)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShareCenterScreen(state:MainUiState,vm:MainViewModel,onActivate:()->Unit,go:(String)->Unit){
    val context=LocalContext.current
    val locale=if(LocalConfiguration.current.locales[0].language=="ar")"ar" else "en"
    var targetId by rememberSaveable{mutableStateOf<String?>(null)}
    var profileMenu by remember{mutableStateOf(false)}
    var targetMenu by remember{mutableStateOf(false)}
    var qrTarget by remember{mutableStateOf<ShareTargetDto?>(null)}
    var product by remember{mutableStateOf<ShareProductDto?>(null)}
    val selector=state.profileSelector
    val targets=state.shareTargets
    val selected=ShareCenterPolicy.selectedTarget(targets?.targets.orEmpty(),targetId)
    LaunchedEffect(Unit){vm.loadShareCenter(locale)}
    LaunchedEffect(targets?.targets){targetId=ShareCenterPolicy.selectedTarget(targets?.targets.orEmpty(),targetId)?.id}
    LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(18.dp)){
        item{
            Text(stringResource(R.string.share_eyebrow),color=MaterialTheme.colorScheme.primary,style=MaterialTheme.typography.labelLarge)
            Text(stringResource(R.string.share_title),style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black)
            Text(stringResource(R.string.share_description),color=MaterialTheme.colorScheme.onSurfaceVariant)
        }
        item{
            Card(Modifier.fillMaxWidth(),shape=RoundedCornerShape(24.dp)){Column(Modifier.padding(18.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
                Text(stringResource(R.string.share_what),style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold)
                Box{
                    OutlinedButton({profileMenu=true},Modifier.fillMaxWidth()){Icon(Icons.Default.Person,null);Spacer(Modifier.width(8.dp));Text(selector?.profiles?.firstOrNull{it.id==state.selectedShareProfileId}?.label?:stringResource(R.string.share_profile))}
                    DropdownMenu(profileMenu,{profileMenu=false}){selector?.profiles.orEmpty().forEach{p->DropdownMenuItem({Text(p.label+(if(p.isPrimary)" · ${stringResource(R.string.editor_primary)}" else ""))},{profileMenu=false;vm.switchShareProfile(p.id,locale)})}}
                }
                Box{
                    OutlinedButton({targetMenu=true},Modifier.fillMaxWidth(),enabled=targets?.shareable==true){Icon(Icons.Default.Link,null);Spacer(Modifier.width(8.dp));Text(selected?.label?:stringResource(R.string.share_target))}
                    DropdownMenu(targetMenu,{targetMenu=false}){targets?.targets.orEmpty().forEach{t->DropdownMenuItem({Text(t.label)},{targetMenu=false;targetId=t.id;vm.trackShareTargetSelected()})}}
                }
                if(targets!=null&&!targets.shareable)Text(stringResource(if(targets.reason=="PROFILE_PAUSED")R.string.share_profile_paused else R.string.share_publish_required),color=MaterialTheme.colorScheme.error)
            }}
        }
        item{
            Text(stringResource(R.string.share_how),style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold)
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(10.dp)){
                ShareMethod(R.string.share_show_qr,Icons.Default.QrCode,Modifier.weight(1f),selected!=null){qrTarget=selected;vm.trackShareQrOpened()}
                ShareMethod(R.string.share_native,Icons.Default.Share,Modifier.weight(1f),selected!=null){selected?.let{shareText(context,it.canonicalUrl);vm.trackNativeShareOpened()}}
                ShareMethod(R.string.share_copy,Icons.Default.ContentCopy,Modifier.weight(1f),selected!=null){selected?.let{copyText(context,it.canonicalUrl);vm.trackShareLinkCopied()}}
            }
            Spacer(Modifier.height(10.dp))
            HceStatus(target=selected,onSelected=vm::trackHceTargetSelected)
        }
        item{
            Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.SpaceBetween){
                Column{Text(stringResource(R.string.share_products),style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold);Text(stringResource(R.string.share_products_help),style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant)}
                Button({vm.trackActivationStarted();onActivate()}){Icon(Icons.Default.AddCircle,null);Spacer(Modifier.width(6.dp));Text(stringResource(R.string.activate_product))}
            }
        }
        if(state.shareProducts.isEmpty())item{Card(Modifier.fillMaxWidth()){Column(Modifier.fillMaxWidth().padding(28.dp),horizontalAlignment=Alignment.CenterHorizontally){Icon(Icons.Default.CreditCard,null);Text(stringResource(R.string.share_no_products),Modifier.padding(top=8.dp))}}}
        items(state.shareProducts,key={it.id}){item->ProductCard(item,{product=item},{copyText(context,item.permanentUrl)})}
        item{Row(horizontalArrangement=Arrangement.spacedBy(12.dp)){TextButton({go("products")}){Text(stringResource(R.string.share_legacy_routes))};TextButton({go("virtual-cards")}){Text(stringResource(R.string.wallet))}}}
    }
    qrTarget?.let{target->ModalBottomSheet({qrTarget=null}){
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(24.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(14.dp)){
            Text(target.label,style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold)
            Text(stringResource(R.string.share_qr_ready),style=MaterialTheme.typography.bodySmall)
            Image(remember(target.canonicalUrl){qrBitmap(target.canonicalUrl)}.asImageBitmap(),stringResource(R.string.share_qr_description),Modifier.fillMaxWidth().aspectRatio(1f))
            FigmaLtrText(target.canonicalUrl,MaterialTheme.typography.bodySmall)
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(10.dp)){Button({shareText(context,target.canonicalUrl)},Modifier.weight(1f)){Text(stringResource(R.string.share_native))};OutlinedButton({copyText(context,target.canonicalUrl)},Modifier.weight(1f)){Text(stringResource(R.string.share_copy))}}
        }
    }}
    product?.let{item->ProductSheet(item,state,vm,locale,{go("card/${item.id}")}){product=null}}
}

@Composable
private fun ShareMethod(label:Int,icon:androidx.compose.ui.graphics.vector.ImageVector,modifier:Modifier,enabled:Boolean,onClick:()->Unit){
    Surface(modifier.heightIn(min=112.dp).clickable(enabled=enabled,onClick=onClick),shape=RoundedCornerShape(20.dp),color=MaterialTheme.colorScheme.surfaceVariant.copy(alpha=.6f)){
        Column(Modifier.padding(14.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){Icon(icon,null);Text(stringResource(label),fontWeight=FontWeight.Bold)}
    }
}

@Composable
private fun HceStatus(target:ShareTargetDto?,onSelected:()->Unit){
    val context=LocalContext.current
    val adapter=remember{NfcAdapter.getDefaultAdapter(context)}
    val hce=remember{context.packageManager.hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION)}
    val state=ShareCenterPolicy.hceState(adapter!=null,adapter?.isEnabled==true,hce)
    val message=when(state){"NFC_UNAVAILABLE"->R.string.share_nfc_unavailable;"NFC_DISABLED"->R.string.share_nfc_disabled;"HCE_UNSUPPORTED"->R.string.share_hce_unsupported;else->R.string.share_nfc_ready}
    Card(Modifier.fillMaxWidth()){Row(Modifier.padding(16.dp),verticalAlignment=Alignment.CenterVertically){Icon(Icons.Default.Contactless,null);Column(Modifier.weight(1f).padding(horizontal=12.dp)){Text(stringResource(R.string.share_nearby),fontWeight=FontWeight.Bold);Text(stringResource(message),style=MaterialTheme.typography.bodySmall)};if(state=="READY"&&target!=null)Button({if(PermanentUrlPolicy.isValid(target.canonicalUrl)){HceConfig.save(context,true,target.canonicalUrl,shareTargetId=target.id);onSelected()}}){Text(stringResource(R.string.share_use_target))}}}
}

@Composable
private fun ProductCard(product:ShareProductDto,manage:()->Unit,copy:()->Unit){
    Card(Modifier.fillMaxWidth(),shape=RoundedCornerShape(22.dp)){Column(Modifier.padding(18.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
        Row(verticalAlignment=Alignment.CenterVertically){Icon(Icons.Default.CreditCard,null);Column(Modifier.weight(1f).padding(horizontal=12.dp)){Text(product.label,fontWeight=FontWeight.Bold);FigmaLtrText(product.maskedSerial,MaterialTheme.typography.bodySmall)};AssistChip({}, {Text(product.status)})}
        Text("${stringResource(R.string.share_assigned_profile)}: ${product.profile?.label?:stringResource(R.string.share_not_assigned)}")
        Text("${stringResource(R.string.share_current_target)}: ${product.shareTarget?.label?:stringResource(R.string.share_not_configured)}")
        Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){Button(manage){Text(stringResource(R.string.share_manage))};OutlinedButton(copy){Icon(Icons.Default.ContentCopy,null);Text(stringResource(R.string.share_permanent_link))}}
    }}
}

private fun productTargetId(product:ShareProductDto,targets:List<ShareTargetDto>):String?{
    val active=product.shareTarget ?: return targets.firstOrNull()?.id
    return targets.firstOrNull{it.id==active.id||it.id=="destination:${active.id}"||(it.type=="PROFILE"&&active.type=="PROFILE")||(it.type=="CONTACT"&&active.type=="VCF")}?.id
        ?:targets.firstOrNull()?.id
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProductSheet(product:ShareProductDto,state:MainUiState,vm:MainViewModel,locale:String,details:()->Unit,close:()->Unit){
    var profileId by rememberSaveable(product.id){mutableStateOf(product.profile?.id?:state.selectedShareProfileId.orEmpty())}
    var targetId by rememberSaveable(product.id){mutableStateOf("")}
    LaunchedEffect(product.id){if(profileId.isNotBlank()&&profileId!=state.selectedShareProfileId)vm.switchShareProfile(profileId,locale)}
    LaunchedEffect(state.shareTargets?.targets,profileId){
        val available=state.shareTargets?.targets.orEmpty()
        targetId=if(profileId==product.profile?.id)productTargetId(product,available).orEmpty() else available.firstOrNull()?.id.orEmpty()
    }
    ModalBottomSheet(close){Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(24.dp),verticalArrangement=Arrangement.spacedBy(14.dp)){
        Text(product.label,style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold)
        Text(stringResource(R.string.share_permanent_safety),style=MaterialTheme.typography.bodySmall)
        state.profileSelector?.profiles.orEmpty().forEach{p->Row(Modifier.fillMaxWidth().clickable{profileId=p.id;vm.switchShareProfile(p.id,locale)}.padding(6.dp),verticalAlignment=Alignment.CenterVertically){RadioButton(profileId==p.id,{profileId=p.id;vm.switchShareProfile(p.id,locale)});Text(p.label)}}
        state.shareTargets?.targets.orEmpty().forEach{t->Row(Modifier.fillMaxWidth().clickable{targetId=t.id}.padding(6.dp),verticalAlignment=Alignment.CenterVertically){RadioButton(targetId==t.id,{targetId=t.id});Text(t.label)}}
        Button({vm.updateShareProduct(product.id,ShareProductUpdateRequest("TARGET_CHANGE",profileId,targetId,locale=locale))},Modifier.fillMaxWidth(),enabled=targetId.isNotBlank()&&product.capabilities.targetChange){Text(stringResource(R.string.share_save_target))}
        if(product.capabilities.pause)OutlinedButton({vm.updateShareProduct(product.id,ShareProductUpdateRequest("STATUS_CHANGE",status="PAUSED",locale=locale))},Modifier.fillMaxWidth()){Text(stringResource(R.string.share_pause))}
        else if(product.capabilities.resume)OutlinedButton({vm.updateShareProduct(product.id,ShareProductUpdateRequest("STATUS_CHANGE",status="ACTIVE",locale=locale))},Modifier.fillMaxWidth()){Text(stringResource(R.string.share_resume))}
        OutlinedButton(details,Modifier.fillMaxWidth()){Text(stringResource(R.string.share_product_details))}
    }}
}

@Composable
fun ShareActivationScreen(state:MainUiState,vm:MainViewModel,onDone:()->Unit){
    val locale=if(LocalConfiguration.current.locales[0].language=="ar")"ar" else "en"
    var identifier by rememberSaveable{mutableStateOf("")}
    var scratch by rememberSaveable{mutableStateOf("")}
    var targetId by rememberSaveable{mutableStateOf("profile")}
    val activation=state.shareActivation
    val context=LocalContext.current
    DisposableEffect(Unit){onDispose{NfcCoordinator.clear()}}
    LaunchedEffect(state.shareTargets?.targets){
        targetId=ShareCenterPolicy.selectedTarget(state.shareTargets?.targets.orEmpty(),targetId)?.id.orEmpty()
    }
    LazyColumn(Modifier.fillMaxSize().imePadding(),contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(14.dp)){
        item{Text(stringResource(R.string.activate_product),style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black);Text(stringResource(R.string.share_activation_help),color=MaterialTheme.colorScheme.onSurfaceVariant)}
        if(activation?.eligible!=true){
            if(activation?.nextAction=="COOLDOWN")item{Text(stringResource(R.string.share_activation_cooldown),color=MaterialTheme.colorScheme.error)}
            else if(activation?.nextAction=="ALREADY_OWNED")item{Text(stringResource(R.string.share_already_owned))}
            else if(activation?.nextAction=="LEGACY_FLOW")item{Button({val url=BuildConfig.API_BASE_URL.trimEnd('/')+(activation.legacyUrl?:"/activate/scan");context.startActivity(Intent(Intent.ACTION_VIEW,Uri.parse(url)))},Modifier.fillMaxWidth()){Text(stringResource(R.string.share_continue_legacy))}}
            else{
                item{QrScanner{identifier=it;vm.inspectScratchActivation(it)}}
                item{OutlinedTextField(identifier,{identifier=ShareCenterPolicy.activationIdentifierCandidate(it)},Modifier.fillMaxWidth(),label={Text(stringResource(R.string.share_product_identifier))},singleLine=true)}
                item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(10.dp)){OutlinedButton({NfcCoordinator.register(vm::inspectActivationTag)},Modifier.weight(1f)){Icon(Icons.Default.Contactless,null);Text(stringResource(R.string.share_identify_nfc))};Button({vm.inspectScratchActivation(identifier)},Modifier.weight(1f),enabled=identifier.isNotBlank()){Text(stringResource(R.string.validate_qr))}}}
            }
        }else{
            activation.product?.let{p->item{Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp)){Text(p.label,fontWeight=FontWeight.Bold);FigmaLtrText(p.maskedSerial,MaterialTheme.typography.bodySmall)}}}}
            item{Text(stringResource(R.string.share_scratch_help),style=MaterialTheme.typography.bodySmall)}
            item{OutlinedTextField(scratch,{scratch=it.filter(Char::isDigit).take(6)},Modifier.fillMaxWidth(),label={Text(stringResource(R.string.share_scratch_code))},singleLine=true,keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.NumberPassword))}
            item{Text(stringResource(R.string.share_assigned_profile),style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.Bold)}
            items(state.profileSelector?.profiles.orEmpty(),key={"profile:${it.id}"}){p->Row(Modifier.fillMaxWidth().clickable{vm.switchShareProfile(p.id,locale)}.padding(6.dp),verticalAlignment=Alignment.CenterVertically){RadioButton(state.selectedShareProfileId==p.id,{vm.switchShareProfile(p.id,locale)});Text(p.label)}}
            item{Text(stringResource(R.string.share_current_target),style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.Bold)}
            items(state.shareTargets?.targets.orEmpty(),key={it.id}){t->Row(Modifier.fillMaxWidth().clickable{targetId=t.id}.padding(6.dp),verticalAlignment=Alignment.CenterVertically){RadioButton(targetId==t.id,{targetId=t.id});Text(t.label)}}
            item{Button({vm.claimScratchActivation(scratch,targetId,locale,onDone)},Modifier.fillMaxWidth(),enabled=ShareCenterPolicy.activationScratchValid(scratch)&&!state.loading){Icon(Icons.Default.Shield,null);Text(stringResource(R.string.share_activate_securely))}}
            item{OutlinedButton({scratch="";vm.clearShareActivation()},Modifier.fillMaxWidth()){Text(stringResource(R.string.share_scan_another))}}
        }
    }
}
