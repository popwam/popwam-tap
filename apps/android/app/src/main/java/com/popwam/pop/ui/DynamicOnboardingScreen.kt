package com.popwam.pop.ui

import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.BackHandler
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonPrimitive
import com.popwam.pop.R
import com.popwam.pop.data.api.OnboardingQuestionDto

@Composable
fun DynamicOnboardingScreen(state:AuthUiState,auth:AuthViewModel,locale:String) {
    val onboarding=state.onboarding
    val definition=onboarding?.definition
    if(onboarding==null||definition==null) {
        SetupOnboardingLoading(auth,locale)
        return
    }
    val steps=visibleOnboardingSteps(definition,onboarding.answers)
    val current=steps.find { it.key==onboarding.currentStepKey } ?: steps.firstOrNull()
    if(current==null) {
        SetupOnboardingFailure(auth,locale)
        return
    }
    val progress=dynamicOnboardingProgress(definition,onboarding.answers,current.key)
    val index=steps.indexOfFirst { it.key==current.key }.coerceAtLeast(0)
    LaunchedEffect(current.key) { auth.onboardingStepViewed(current.key) }
    BackHandler(enabled=!state.loading&&index>0) { auth.saveOnboarding("BACK",locale) }
    Scaffold(
        modifier=Modifier.fillMaxSize().safeDrawingPadding().imePadding(),
        bottomBar={
            Surface(shadowElevation=10.dp,color=MaterialTheme.colorScheme.surface.copy(alpha=.97f)) {
                Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal=20.dp,vertical=12.dp),verticalArrangement=Arrangement.spacedBy(6.dp)) {
                    Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(10.dp)) {
                        if(index>0) OutlinedButton(onClick={auth.saveOnboarding("BACK",locale)},modifier=Modifier.weight(1f).heightIn(min=52.dp),enabled=!state.loading) { Icon(Icons.AutoMirrored.Outlined.ArrowBack,null);Spacer(Modifier.width(6.dp));Text(stringResource(R.string.back)) }
                        Button(onClick={auth.saveOnboarding("CONTINUE",locale)},modifier=Modifier.weight(1f).heightIn(min=52.dp),enabled=!state.loading) { Text(stringResource(if(index==steps.lastIndex)R.string.finish_setup else R.string.continue_label)) }
                    }
                    TextButton(onClick={auth.saveOnboarding("STAY",locale)},modifier=Modifier.fillMaxWidth(),enabled=!state.loading) { Text(stringResource(R.string.onboarding_save_resume)) }
                }
            }
        },
    ) { padding -> LazyColumn(
        modifier=Modifier.fillMaxSize().padding(padding).padding(horizontal=20.dp),
        contentPadding=PaddingValues(vertical=24.dp),
        verticalArrangement=Arrangement.spacedBy(16.dp),
    ) {
        item {
            Text(stringResource(R.string.onboarding_title),style=MaterialTheme.typography.labelLarge,color=MaterialTheme.colorScheme.primary)
            Text(current.title,style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black)
            current.description?.let { Text(it,color=MaterialTheme.colorScheme.onSurfaceVariant) }
            Text(stringResource(R.string.onboarding_progress,progress.current,progress.total),style=MaterialTheme.typography.labelLarge)
            LinearProgressIndicator(
                progress={progress.percent/100f},
                modifier=Modifier.fillMaxWidth().padding(top=10.dp),
            )
        }
        items(visibleOnboardingQuestions(current,onboarding.answers),key={it.key}) { question->
            OnboardingQuestion(
                question=question,
                value=onboarding.answers[question.key],
                error=state.onboardingFieldErrors[question.key],
                auth=auth,
            )
        }
        state.error?.let {
            item { Text(stringResource(if(it=="ONBOARDING_PROGRESS_STALE")R.string.onboarding_stale else R.string.onboarding_error),color=MaterialTheme.colorScheme.error) }
        }
        if(state.loading)item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
    } }
}

@Composable
private fun OnboardingQuestion(question:OnboardingQuestionDto,value:JsonElement?,error:String?,auth:AuthViewModel) {
    Surface(shape=RoundedCornerShape(24.dp),color=MaterialTheme.colorScheme.surfaceContainerHigh.copy(alpha=.72f),modifier=Modifier.fillMaxWidth()) { Column(Modifier.padding(18.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween) {
            Text(question.label,fontWeight=FontWeight.Bold)
            if(!question.required)Text(stringResource(R.string.onboarding_optional),style=MaterialTheme.typography.labelSmall,color=MaterialTheme.colorScheme.onSurfaceVariant)
        }
        question.help?.let { Text(it,style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant) }
        when(onboardingRenderControl(question.type)) {
            OnboardingRenderControl.TEXT,OnboardingRenderControl.TEXTAREA -> OnboardingTextQuestion(question,value,error,auth)
            OnboardingRenderControl.BOOLEAN -> Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                val selected=runCatching { value?.asBoolean }.getOrNull()
                FilterChip(selected=selected==true,onClick={auth.setOnboardingAnswer(question.key,JsonPrimitive(true))},label={Text(stringResource(R.string.yes))},modifier=Modifier.weight(1f))
                FilterChip(selected=selected==false,onClick={auth.setOnboardingAnswer(question.key,JsonPrimitive(false))},label={Text(stringResource(R.string.no))},modifier=Modifier.weight(1f))
            }
            OnboardingRenderControl.SINGLE_SELECT -> question.options.forEach { option->
                FilterChip(
                    selected=runCatching { value?.asString==option.key }.getOrDefault(false),
                    onClick={auth.setOnboardingAnswer(question.key,JsonPrimitive(option.key))},
                    label={Text(option.label)},
                    modifier=Modifier.fillMaxWidth(),
                )
            }
            OnboardingRenderControl.MULTI_SELECT -> {
                val selected=if(value?.isJsonArray==true)value.asJsonArray.mapNotNull { runCatching { it.asString }.getOrNull() } else emptyList()
                question.options.forEach { option->
                    FilterChip(
                        selected=option.key in selected,
                        onClick={
                            val next=if(option.key in selected)selected-option.key else selected+option.key
                            auth.setOnboardingAnswer(question.key,JsonArray().apply { next.forEach { add(JsonPrimitive(it)) } })
                        },
                        label={Text(option.label)},
                        modifier=Modifier.fillMaxWidth(),
                    )
                }
            }
            OnboardingRenderControl.IMAGE_LATER -> OnboardingImageQuestion(question.key,value,auth)
            OnboardingRenderControl.UNKNOWN -> Text(stringResource(R.string.onboarding_unknown_question),color=MaterialTheme.colorScheme.error)
        }
        if(error!=null)Text(stringResource(if(error=="REQUIRED")R.string.onboarding_required else R.string.onboarding_invalid),color=MaterialTheme.colorScheme.error,style=MaterialTheme.typography.bodySmall)
    } }
}

@Composable
private fun OnboardingImageQuestion(questionKey:String,value:JsonElement?,auth:AuthViewModel){
    val context=LocalContext.current
    val launcher=rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()){uri->
        if(uri!=null){
            val mime=context.contentResolver.getType(uri).orEmpty()
            val name=context.contentResolver.query(uri,arrayOf(OpenableColumns.DISPLAY_NAME),null,null,null)?.use{cursor->if(cursor.moveToFirst())cursor.getString(0) else null} ?: "profile-image"
            val bytes=context.contentResolver.openInputStream(uri)?.use{it.readBytes()}
            if(bytes!=null)auth.uploadOnboardingImage(questionKey,name,mime,bytes)
        }
    }
    val selected=value?.isJsonArray==true&&value.asJsonArray.size()>0
    OutlinedButton({launcher.launch(arrayOf("image/jpeg","image/png","image/webp"))},Modifier.fillMaxWidth()){
        Text(stringResource(if(selected)R.string.upload_complete else R.string.choose_upload))
    }
}

@Composable
private fun OnboardingTextQuestion(question:OnboardingQuestionDto,value:JsonElement?,error:String?,auth:AuthViewModel) {
    val text=runCatching { value?.asString.orEmpty() }.getOrDefault("")
    val keyboard=when(question.type) {
        "PHONE" -> KeyboardType.Phone
        "EMAIL" -> KeyboardType.Email
        "URL" -> KeyboardType.Uri
        "NUMBER","CURRENCY" -> KeyboardType.Decimal
        else -> KeyboardType.Text
    }
    val field:@Composable ()->Unit={
        OutlinedTextField(
            value=text,
            onValueChange={next->
                val answer=if(question.type=="NUMBER"||question.type=="CURRENCY")next.toDoubleOrNull()?.let(::JsonPrimitive) ?: JsonPrimitive(next) else JsonPrimitive(next)
                auth.setOnboardingAnswer(question.key,answer)
            },
            modifier=Modifier.fillMaxWidth(),
            minLines=if(question.type in setOf("TEXTAREA","LOCATION","DAY_HOURS"))3 else 1,
            keyboardOptions=KeyboardOptions(keyboardType=keyboard),
            isError=error!=null,
        )
    }
    if(question.type in setOf("PHONE","EMAIL","URL","NUMBER","CURRENCY","TIME"))
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) { field() }
    else field()
}

@Composable
private fun SetupOnboardingLoading(auth:AuthViewModel,locale:String) {
    Box(Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp)) {
        Column(verticalArrangement=Arrangement.spacedBy(16.dp)) {
            Text(stringResource(R.string.setup_checking),style=MaterialTheme.typography.headlineSmall)
            CircularProgressIndicator()
            OutlinedButton(onClick={auth.refreshSetup(locale)},modifier=Modifier.fillMaxWidth()) { Text(stringResource(R.string.retry)) }
        }
    }
}

@Composable
private fun SetupOnboardingFailure(auth:AuthViewModel,locale:String) {
    Box(Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp)) {
        Column(verticalArrangement=Arrangement.spacedBy(16.dp)) {
            Text(stringResource(R.string.onboarding_unknown_question),color=MaterialTheme.colorScheme.error)
            Button(onClick={auth.refreshSetup(locale)},modifier=Modifier.fillMaxWidth()) { Text(stringResource(R.string.retry)) }
        }
    }
}
