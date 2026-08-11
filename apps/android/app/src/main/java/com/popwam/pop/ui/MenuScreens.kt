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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.popwam.pop.R

data class MenuProfileContext(
    val name: String,
    val subtitle: String? = null,
    val avatarUrl: String? = null,
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
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 18.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Text(
                stringResource(R.string.nav_menu),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
            )
        }
        item { MenuProfileCard(profile, navigate) }
        item {
            MenuGroup(
                title = stringResource(R.string.settings_account_group),
                rows = listOf(
                    MenuRowModel(Icons.Default.AccountCircle, R.string.settings_account, MenuDestination.ACCOUNT.route),
                    MenuRowModel(Icons.Default.Security, R.string.settings_login_security, MenuDestination.SECURITY.route),
                    MenuRowModel(Icons.Default.Devices, R.string.settings_saved_devices, MenuDestination.DEVICES.route),
                ),
                navigate = navigate,
            )
        }
        item {
            MenuGroup(
                title = stringResource(R.string.settings_preferences_group),
                rows = listOf(
                    MenuRowModel(Icons.Default.Language, R.string.settings_language_region, MenuDestination.LANGUAGE.route),
                    MenuRowModel(Icons.Default.Palette, R.string.settings_appearance, MenuDestination.APPEARANCE.route),
                    MenuRowModel(Icons.Default.PrivacyTip, R.string.settings_privacy, MenuDestination.PRIVACY.route),
                    MenuRowModel(Icons.Default.Notifications, R.string.settings_notifications, MenuDestination.NOTIFICATIONS.route),
                ),
                navigate = navigate,
            )
        }
        item {
            MenuGroup(
                title = stringResource(R.string.settings_support_group),
                rows = listOf(
                    MenuRowModel(Icons.Default.HelpOutline, R.string.settings_help_center, MenuDestination.HELP.route),
                    MenuRowModel(Icons.Default.Info, R.string.about_app, MenuDestination.ABOUT.route),
                    MenuRowModel(Icons.Default.Gavel, R.string.settings_legal, MenuDestination.LEGAL.route),
                ),
                navigate = navigate,
            )
        }
        item {
            OutlinedButton(
                onClick = { confirmLogout = true },
                modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.error),
            ) {
                Icon(Icons.Default.Logout, contentDescription = null)
                Spacer(Modifier.width(10.dp))
                Text(stringResource(R.string.logout), fontWeight = FontWeight.SemiBold)
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

private data class MenuRowModel(val icon: ImageVector, val label: Int, val route: String)

@Composable
private fun MenuProfileCard(profile: MenuProfileContext?, navigate: (String) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { navigate(MenuDestination.PROFILES.route) },
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
    ) {
        Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(
                Modifier.size(56.dp).clip(CircleShape),
                color = MaterialTheme.colorScheme.surface,
                shape = CircleShape,
            ) {
                if (!profile?.avatarUrl.isNullOrBlank()) {
                    AsyncImage(profile!!.avatarUrl, contentDescription = null, modifier = Modifier.fillMaxSize())
                } else {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Person, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                }
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    profile?.name ?: stringResource(R.string.no_active_profile),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    profile?.subtitle ?: stringResource(R.string.settings_manage_profiles),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null)
        }
    }
}

@Composable
private fun MenuGroup(title: String, rows: List<MenuRowModel>, navigate: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Text(
            title,
            modifier = Modifier.padding(horizontal = 4.dp),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp)) {
            Column {
                rows.forEachIndexed { index, row ->
                    Row(
                        Modifier.fillMaxWidth().clickable { navigate(row.route) }.heightIn(min = 56.dp).padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(row.icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.width(14.dp))
                        Text(stringResource(row.label), Modifier.weight(1f), fontWeight = FontWeight.Medium)
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (index != rows.lastIndex) HorizontalDivider(Modifier.padding(horizontal = 16.dp))
                }
            }
        }
    }
}

@Composable
fun MenuReviewScreen(profile: MenuProfileContext? = MenuProfileContext("Sarah Ahmed", "Personal profile")) {
    PopMenuScreen(profile = profile, navigate = {}, logout = {})
}
