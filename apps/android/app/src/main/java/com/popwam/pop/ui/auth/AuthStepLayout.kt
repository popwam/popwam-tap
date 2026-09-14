package com.popwam.pop.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.popwam.pop.R
import com.popwam.pop.ui.currentLocale
import com.popwam.pop.ui.components.PopOfficialLogo

/** Shared visual rhythm. Each screen owns a single task and scrolls above the IME. */
@Composable fun AuthStepLayout(title:String,helper:String,icon:ImageVector,step:Int=0,total:Int=6,back:(()->Unit)?=null,content:@Composable ColumnScope.()->Unit) {
    val colors=MaterialTheme.colorScheme
    CompositionLocalProvider(LocalLayoutDirection provides if(currentLocale()=="ar")LayoutDirection.Rtl else LayoutDirection.Ltr) {
        Surface(Modifier.fillMaxSize()) {
            Column(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(colors.primaryContainer.copy(alpha=.35f),colors.surface)))
                .safeDrawingPadding().imePadding().verticalScroll(rememberScrollState()).padding(horizontal=16.dp,vertical=12.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
                Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.SpaceBetween) {
                    if(back!=null)IconButton(back){Icon(Icons.AutoMirrored.Filled.ArrowBack,stringResource(R.string.p7_back))}
                    PopOfficialLogo(Modifier.width(72.dp).height(40.dp))
                }
                if(step>0){Text(stringResource(R.string.p7_progress,step,total),style=MaterialTheme.typography.labelMedium);LinearProgressIndicator(progress={step.toFloat()/total},modifier=Modifier.fillMaxWidth())}
                Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)) {
                    Icon(icon,null,Modifier.size(24.dp),tint=colors.primary)
                    Text(title,style=MaterialTheme.typography.headlineSmall)
                }
                if(helper.isNotBlank())Text(helper,style=MaterialTheme.typography.bodyMedium,color=colors.onSurfaceVariant)
                content()
                Spacer(Modifier.height(12.dp))
            }
        }
    }
}
@Composable fun AuthPrimary(text:String,enabled:Boolean=true,onClick:()->Unit){Button(onClick,Modifier.fillMaxWidth().heightIn(min=48.dp),enabled=enabled,shape=RoundedCornerShape(12.dp)){Text(text)}}
