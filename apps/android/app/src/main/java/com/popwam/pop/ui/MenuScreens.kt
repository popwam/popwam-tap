package com.popwam.pop.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.popwam.pop.R
import com.popwam.pop.ui.components.PopApprovedAsset
import com.popwam.pop.ui.components.PopApprovedAvatar

data class MenuProfileContext(
    val name: String,
    val subtitle: String? = null,
    val avatarUrl: String? = null,
    val type: String? = null,
    val verified: Boolean = false,
    val publicUrl: String? = null,
    val completionPercent: Int? = null,
)

internal enum class MenuDestination(val route: String) {
    PROFILES("profiles"),
    ACCOUNT("settings/account"),
    SECURITY("settings/security"),
    DEVICES("settings/devices"),
    LANGUAGE("settings/language"),
    APPEARANCE("settings/appearance"),
    PRIVACY("settings/privacy"),
    NOTIFICATIONS("settings/notifications"),
    HELP("settings/help"),
    ABOUT("settings/about"),
    LEGAL("settings/legal"),
}

@Composable
fun PopMenuScreen(
    profile: MenuProfileContext?,
    navigate: (String) -> Unit,
    logout: () -> Unit,
) {
    var confirmLogout by rememberSaveable { mutableStateOf(false) }
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 14.dp, end = 14.dp, top = 12.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { MenuProfileCard(profile, navigate) }
        item {
            MenuGroup(
                title = stringResource(R.string.settings_account_group),
                rows = listOf(
                    MenuRowModel(R.drawable.pop_approved_menu_profiles, R.string.profiles_title, MenuDestination.PROFILES.route),
                    MenuRowModel(R.drawable.pop_approved_menu_account, R.string.settings_account, MenuDestination.ACCOUNT.route),
                    MenuRowModel(R.drawable.pop_approved_menu_security, R.string.settings_login_security, MenuDestination.SECURITY.route),
                    MenuRowModel(R.drawable.pop_approved_menu_devices, R.string.settings_saved_devices, MenuDestination.DEVICES.route),
                ),
                navigate = navigate,
            )
        }
        item {
            MenuGroup(
                title = stringResource(R.string.settings_preferences_group),
                rows = listOf(
                    MenuRowModel(R.drawable.pop_approved_menu_language, R.string.settings_language_region, MenuDestination.LANGUAGE.route),
                    MenuRowModel(R.drawable.pop_approved_menu_appearance, R.string.settings_appearance, MenuDestination.APPEARANCE.route),
                    MenuRowModel(R.drawable.pop_approved_menu_privacy, R.string.settings_privacy, MenuDestination.PRIVACY.route),
                    MenuRowModel(R.drawable.pop_approved_menu_notifications, R.string.settings_notifications, MenuDestination.NOTIFICATIONS.route),
                ),
                navigate = navigate,
            )
        }
        item {
            MenuGroup(
                title = stringResource(R.string.settings_support_group),
                rows = listOf(
                    MenuRowModel(R.drawable.pop_approved_menu_help, R.string.settings_help_center, MenuDestination.HELP.route),
                    MenuRowModel(R.drawable.pop_approved_menu_about, R.string.about_app, MenuDestination.ABOUT.route),
                    MenuRowModel(R.drawable.pop_approved_menu_legal, R.string.settings_legal, MenuDestination.LEGAL.route),
                ),
                navigate = navigate,
            )
        }
        item {
            Surface(Modifier.fillMaxWidth().heightIn(min=54.dp).clickable{confirmLogout=true},shape=RoundedCornerShape(8.dp),color=MaterialTheme.colorScheme.errorContainer.copy(alpha=.55f),shadowElevation=2.dp){
                Row(Modifier.fillMaxWidth().padding(horizontal=16.dp,vertical=13.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.Center){
                    PopApprovedAsset(R.drawable.pop_approved_menu_logout,null,Modifier.size(24.dp),MaterialTheme.colorScheme.error)
                    Spacer(Modifier.width(10.dp))
                    Text(stringResource(R.string.logout),fontWeight=FontWeight.SemiBold,color=MaterialTheme.colorScheme.error)
                }
            }
        }
    }
    if (confirmLogout) {
        AlertDialog(
            onDismissRequest = { confirmLogout = false },
            title = { Text(stringResource(R.string.settings_logout_confirm_title), fontWeight = FontWeight.Bold) },
            text = { Text(stringResource(R.string.settings_logout_confirm_body)) },
            confirmButton = {
                TextButton(onClick = { confirmLogout = false; logout() }) {
                    Text(stringResource(R.string.logout), color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = { TextButton(onClick = { confirmLogout = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

private data class MenuRowModel(val icon: Int, val label: Int, val route: String)

@Composable
private fun MenuProfileCard(profile: MenuProfileContext?, navigate: (String) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { navigate(MenuDestination.PROFILES.route) },
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp,MaterialTheme.colorScheme.outline.copy(alpha=.45f)),
        elevation = CardDefaults.cardElevation(defaultElevation=4.dp),
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
            Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(14.dp)){
                PopApprovedAvatar(profile?.avatarUrl,profile?.name,76.dp)
                Column(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(3.dp)){
                    Text(profile?.name ?: stringResource(R.string.no_active_profile),style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold,maxLines=2,overflow=TextOverflow.Ellipsis)
                    Text(profile?.type ?: profile?.subtitle ?: stringResource(R.string.settings_manage_profiles),style=MaterialTheme.typography.labelMedium,color=MaterialTheme.colorScheme.primary,maxLines=2,overflow=TextOverflow.Ellipsis)
                    profile?.subtitle?.takeIf{it.isNotBlank()&&it!=profile.type}?.let{Text(it,style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant,maxLines=2)}
                    Text(stringResource(if(profile?.verified==true)R.string.profile_verified else R.string.profile_unverified),style=MaterialTheme.typography.labelSmall,color=MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            profile?.publicUrl?.takeIf(String::isNotBlank)?.let{url->androidx.compose.runtime.CompositionLocalProvider(LocalLayoutDirection provides androidx.compose.ui.unit.LayoutDirection.Ltr){Text(url,style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant,maxLines=2)}}
            profile?.completionPercent?.let{percent->Column(verticalArrangement=Arrangement.spacedBy(6.dp)){Text(stringResource(R.string.profile_completion_percent,percent),style=MaterialTheme.typography.bodySmall);LinearProgressIndicator({percent/100f},Modifier.fillMaxWidth().height(4.dp),trackColor=MaterialTheme.colorScheme.surfaceVariant)}}
        }
    }
}

@Composable
private fun MenuGroup(title: String, rows: List<MenuRowModel>, navigate: (String) -> Unit) {
    val direction=LocalLayoutDirection.current
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            title,
            modifier = Modifier.padding(horizontal = 4.dp),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp),colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.surface),border=BorderStroke(1.dp,MaterialTheme.colorScheme.outline.copy(alpha=.3f)),elevation=CardDefaults.cardElevation(defaultElevation=3.dp)) {
            Column {
                rows.forEachIndexed { index, row ->
                    Row(
                        Modifier.fillMaxWidth().clickable { navigate(row.route) }.heightIn(min = 52.dp).padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        PopApprovedAsset(row.icon,null,Modifier.size(24.dp))
                        Spacer(Modifier.width(12.dp))
                        Text(stringResource(row.label), Modifier.weight(1f), fontWeight = FontWeight.Medium)
                        PopApprovedAsset(R.drawable.pop_approved_chevron,null,Modifier.size(29.dp).graphicsLayer(scaleX=if(direction==androidx.compose.ui.unit.LayoutDirection.Ltr)-1f else 1f),MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (index != rows.lastIndex) HorizontalDivider(Modifier.padding(horizontal = 14.dp),color=MaterialTheme.colorScheme.outline.copy(alpha=.35f))
                }
            }
        }
    }
}

@Composable
fun MenuReviewScreen(profile: MenuProfileContext? = MenuProfileContext("Sarah Ahmed", "Personal profile")) {
    PopMenuScreen(profile = profile, navigate = {}, logout = {})
}
