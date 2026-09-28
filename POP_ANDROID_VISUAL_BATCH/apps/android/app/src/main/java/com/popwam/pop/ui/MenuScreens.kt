package com.popwam.pop.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.popwam.pop.R
import com.popwam.pop.ui.components.PopApprovedAsset

private val MenuInk = Color(0xFF111817)
private val MenuMuted = Color(0xFF52605E)
private val MenuAccent = Color(0xFF0EA5A4)
private val MenuAvatarBackground = Color(0xFFF3F4F6)
private val MenuProgressTrack = Color(0xFFEEF3F2)
private val MenuLogoutBackground = Color(0xFFFEF2F2)
private val MenuLogoutInk = Color(0xFF991B1B)

data class MenuProfileContext(
    val name: String,
    val subtitle: String? = null,
    val avatarUrl: String? = null,
    val type: String? = null,
    val verified: Boolean = false,
    val publicUrl: String? = null,
    val completionPercent: Int? = null,
    // Optional display fields used by the approved Menu account card.
    // Kept at the end so existing callers remain source-compatible.
    val phoneNumber: String? = null,
    val address: String? = null,
)

internal enum class MenuDestination(val route: String) {
    ACCOUNT("settings/account"),
    SECURITY("settings/security"),
    DEVICE_SECURITY("settings/device-security"),
    DEVICES("settings/devices"),
    LANGUAGE("settings/language"),
    FULL_SETTINGS("settings"),
}

@Composable
fun PopMenuScreen(
    profile: MenuProfileContext?,
    navigate: (String) -> Unit,
    logout: () -> Unit,
) {
    var confirmLogout by rememberSaveable { mutableStateOf(false) }

    androidx.compose.foundation.lazy.LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = 12.dp, bottom = 28.dp),
    ) {
        item {
            MenuProfileCard(
                profile = profile,
                onAccountSetup = { navigate(MenuDestination.ACCOUNT.route) },
            )
        }

        // Figma: profile card bottom 276, first row begins 329.
        item { Spacer(Modifier.height(52.dp)) }

        val rows = listOf(
            MenuRowModel(
                icon = R.drawable.pop_figma_menu_account_info,
                label = R.string.menu_account_information,
                route = MenuDestination.ACCOUNT.route,
            ),
            MenuRowModel(
                icon = R.drawable.pop_figma_menu_login_security,
                label = R.string.settings_login_security,
                route = MenuDestination.SECURITY.route,
            ),
            MenuRowModel(
                icon = R.drawable.pop_figma_menu_passcode_fingerprint,
                label = R.string.menu_passcode_fingerprint,
                route = MenuDestination.DEVICE_SECURITY.route,
            ),
            MenuRowModel(
                icon = R.drawable.pop_figma_menu_saved_devices,
                label = R.string.settings_saved_devices,
                route = MenuDestination.DEVICES.route,
            ),
            MenuRowModel(
                icon = R.drawable.pop_figma_menu_language_region,
                label = R.string.settings_language_region,
                route = MenuDestination.LANGUAGE.route,
            ),
            MenuRowModel(
                icon = R.drawable.pop_figma_menu_full_settings,
                label = R.string.menu_full_settings,
                route = MenuDestination.FULL_SETTINGS.route,
            ),
        )

        rows.forEachIndexed { index, row ->
            item(key = row.route) {
                ApprovedMenuRow(row = row, navigate = navigate)
            }
            if (index != rows.lastIndex) {
                item { Spacer(Modifier.height(10.dp)) }
            }
        }

        item { Spacer(Modifier.height(10.dp)) }
        item {
            ApprovedLogoutButton { confirmLogout = true }
        }
    }

    if (confirmLogout) {
        AlertDialog(
            onDismissRequest = { confirmLogout = false },
            title = {
                Text(
                    stringResource(R.string.settings_logout_confirm_title),
                    fontWeight = FontWeight.Bold,
                )
            },
            text = { Text(stringResource(R.string.settings_logout_confirm_body)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmLogout = false
                        logout()
                    },
                ) {
                    Text(stringResource(R.string.logout), color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmLogout = false }) {
                    Text(stringResource(R.string.cancel))
                }
            },
        )
    }
}

private data class MenuRowModel(
    @DrawableRes val icon: Int,
    @StringRes val label: Int,
    val route: String,
)

@Composable
private fun MenuProfileCard(
    profile: MenuProfileContext?,
    onAccountSetup: () -> Unit,
) {
    val context = LocalContext.current
    val completion = (profile?.completionPercent ?: 0).coerceIn(0, 100)
    val secondaryLine = profile?.phoneNumber
        ?.takeIf(String::isNotBlank)
        ?: profile?.subtitle?.takeIf(String::isNotBlank)
        ?: profile?.type?.takeIf(String::isNotBlank)
    val address = profile?.address?.takeIf(String::isNotBlank)
    val url = profile?.publicUrl?.takeIf(String::isNotBlank)

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 237.dp),
        shape = RoundedCornerShape(7.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 4.dp,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.fillMaxWidth()) {
            Spacer(Modifier.height(47.dp))

            BoxWithConstraints(Modifier.fillMaxWidth()) {
                val compact = maxWidth < 350.dp

                if (!compact) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 77.dp)
                            .padding(start = 2.dp, end = 5.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        MenuAvatar(profile = profile, size = 77.dp)
                        Spacer(Modifier.width(10.dp))
                        MenuIdentityText(
                            profile = profile,
                            secondaryLine = secondaryLine,
                            address = address,
                            url = url,
                            context = context,
                            modifier = Modifier.weight(1f),
                        )
                        Spacer(Modifier.width(8.dp))
                        AccountSetupButton(onClick = onAccountSetup)
                    }
                } else {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            MenuAvatar(profile = profile, size = 70.dp)
                            Spacer(Modifier.width(10.dp))
                            MenuIdentityText(
                                profile = profile,
                                secondaryLine = secondaryLine,
                                address = address,
                                url = url,
                                context = context,
                                modifier = Modifier.weight(1f),
                            )
                        }
                        AccountSetupButton(
                            onClick = onAccountSetup,
                            modifier = Modifier.align(Alignment.End),
                        )
                    }
                }
            }

            Spacer(Modifier.height(if (secondaryLine == null && address == null && url == null) 20.dp else 18.dp))

            Column(
                modifier = Modifier.padding(horizontal = 45.dp),
                verticalArrangement = Arrangement.spacedBy(5.dp),
            ) {
                Text(
                    text = stringResource(R.string.menu_pop_complete, completion),
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = stringResource(R.string.menu_complete_profile_discovery),
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(8.dp))
                LinearProgressIndicator(
                    progress = { completion / 100f },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .clip(RoundedCornerShape(99.dp)),
                    color = MenuAccent,
                    trackColor = MenuProgressTrack,
                )
            }

            Spacer(Modifier.height(30.dp))
        }
    }
}

@Composable
private fun MenuIdentityText(
    profile: MenuProfileContext?,
    secondaryLine: String?,
    address: String?,
    url: String?,
    context: Context,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            text = profile?.name?.takeIf(String::isNotBlank)
                ?: stringResource(R.string.no_active_profile),
            color = MaterialTheme.colorScheme.onSurface,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )

        secondaryLine?.let {
            Text(
                text = it,
                color = MenuAccent,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        address?.let {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                PopApprovedAsset(
                    drawable = R.drawable.pop_figma_menu_location,
                    contentDescription = null,
                    modifier = Modifier.size(13.dp),
                )
                Text(
                    text = it,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }

        url?.let {
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        text = it,
                        modifier = Modifier.weight(1f, fill = false),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 10.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    PopApprovedAsset(
                        drawable = R.drawable.pop_figma_menu_copy,
                        contentDescription = stringResource(R.string.share_copy),
                        modifier = Modifier
                            .size(16.dp)
                            .clickable {
                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                clipboard.setPrimaryClip(ClipData.newPlainText("POP profile", it))
                            },
                    )
                }
            }
        }
    }
}

@Composable
private fun MenuAvatar(
    profile: MenuProfileContext?,
    size: androidx.compose.ui.unit.Dp,
) {
    val shape = RoundedCornerShape(22.dp)
    Surface(
        modifier = Modifier.size(size),
        shape = shape,
        color = MenuAvatarBackground,
        border = BorderStroke(1.dp, Color.White),
    ) {
        if (!profile?.avatarUrl.isNullOrBlank()) {
            AsyncImage(
                model = profile?.avatarUrl,
                contentDescription = profile?.name,
                modifier = Modifier
                    .fillMaxSize()
                    .clip(shape),
                contentScale = ContentScale.Crop,
            )
        } else {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                PopApprovedAsset(
                    drawable = R.drawable.pop_figma_menu_avatar_person,
                    contentDescription = profile?.name,
                    modifier = Modifier.size(size * 0.68f),
                )
            }
        }
    }
}

@Composable
private fun AccountSetupButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier
            .width(114.dp)
            .height(30.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(5.5.dp),
        color = Color.Transparent,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.onSurface),
    ) {
        Row(
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            PopApprovedAsset(
                drawable = R.drawable.pop_figma_menu_account_setup,
                contentDescription = null,
                modifier = Modifier.size(22.dp),
                tint = MaterialTheme.colorScheme.onSurface,
            )
            Spacer(Modifier.width(7.dp))
            Text(
                text = stringResource(R.string.menu_account_setup),
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun ApprovedMenuRow(
    row: MenuRowModel,
    navigate: (String) -> Unit,
) {
    val direction = LocalLayoutDirection.current

    Surface(
        modifier = Modifier
            .padding(horizontal = 4.5.dp)
            .fillMaxWidth()
            .height(46.dp)
            .clickable { navigate(row.route) },
        shape = RoundedCornerShape(15.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp,
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(start = 24.dp, end = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            PopApprovedAsset(
                drawable = row.icon,
                contentDescription = null,
                modifier = Modifier.size(28.dp),
                tint = MaterialTheme.colorScheme.onSurface,
            )
            Spacer(Modifier.width(28.dp))
            Text(
                text = stringResource(row.label),
                modifier = Modifier.weight(1f),
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            PopApprovedAsset(
                drawable = R.drawable.pop_approved_chevron,
                contentDescription = null,
                modifier = Modifier
                    .size(24.dp)
                    .graphicsLayer(
                        scaleX = if (direction == LayoutDirection.Ltr) -1f else 1f,
                    ),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun ApprovedLogoutButton(onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .padding(horizontal = 4.5.dp)
            .fillMaxWidth()
            .height(54.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(15.dp),
        color = MenuLogoutBackground,
    ) {
        Row(
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = stringResource(R.string.logout),
                color = MenuLogoutInk,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.width(18.dp))
            PopApprovedAsset(
                drawable = R.drawable.pop_figma_menu_logout,
                contentDescription = null,
                modifier = Modifier.size(30.dp),
            )
        }
    }
}

@Composable
fun MenuReviewScreen(
    profile: MenuProfileContext? = MenuProfileContext(
        name = "Full Name",
        subtitle = "Phone Number",
        publicUrl = "pop.popwam.com/{slog}",
        completionPercent = 0,
        address = "Address",
    ),
) {
    PopMenuScreen(profile = profile, navigate = {}, logout = {})
}
