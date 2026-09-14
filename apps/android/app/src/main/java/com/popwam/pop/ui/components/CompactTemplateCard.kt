package com.popwam.pop.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.popwam.pop.BuildConfig
import com.popwam.pop.R

/** The same compact choice is used during onboarding and profile editing. */
@Composable fun CompactTemplateCard(
    title:String, imageUrl:String?, selected:Boolean, allowed:Boolean,
    modifier:Modifier=Modifier, enabled:Boolean=true, onSelect:()->Unit,
    onPreview:(()->Unit)?=null,
) {
    Card(onClick=onSelect,modifier=modifier,enabled=allowed&&enabled,
        shape=RoundedCornerShape(12.dp),
        border=BorderStroke(if(selected)2.dp else 1.dp,if(selected)MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant),
        colors=CardDefaults.cardColors(containerColor=if(selected)MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface)) {
        Box(Modifier.fillMaxWidth().height(116.dp),contentAlignment=Alignment.Center) {
            if(!imageUrl.isNullOrBlank())AsyncImage(
                if(imageUrl.startsWith("/"))BuildConfig.API_BASE_URL.trimEnd('/')+imageUrl else imageUrl,
                title,Modifier.fillMaxSize(),contentScale=ContentScale.Crop,alignment=Alignment.TopCenter)
            else Icon(Icons.Default.Person,null,Modifier.size(32.dp),tint=MaterialTheme.colorScheme.primary)
            if(selected||!allowed)Surface(Modifier.align(Alignment.TopEnd).padding(8.dp),shape=RoundedCornerShape(8.dp),color=MaterialTheme.colorScheme.surface) {
                Icon(if(allowed)Icons.Default.CheckCircle else Icons.Default.Lock,
                    stringResource(if(allowed)R.string.p7_selected else R.string.p7_plan_locked),Modifier.padding(4.dp).size(20.dp),tint=MaterialTheme.colorScheme.primary)
            }
        }
        Column(Modifier.padding(horizontal=10.dp,vertical=8.dp),verticalArrangement=Arrangement.spacedBy(4.dp)) {
            Text(title,style=MaterialTheme.typography.titleSmall,maxLines=2,overflow=TextOverflow.Ellipsis)
            if(!allowed)Text(stringResource(R.string.p7_plan_locked),style=MaterialTheme.typography.labelSmall,color=MaterialTheme.colorScheme.error)
            if(onPreview!=null)TextButton(onPreview,Modifier.fillMaxWidth(),enabled=allowed&&enabled,contentPadding=PaddingValues(0.dp)){Text(stringResource(R.string.p7_preview))}
        }
    }
}
