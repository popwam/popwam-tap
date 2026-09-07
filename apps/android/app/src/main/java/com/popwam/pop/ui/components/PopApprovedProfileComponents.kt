package com.popwam.pop.ui.components

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.popwam.pop.R

/** Exact raster exports from the approved POP Figma file. */
@Composable
fun PopApprovedAsset(
    @DrawableRes drawable: Int,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    tint: Color? = null,
) {
    Image(
        painter = painterResource(drawable),
        contentDescription = contentDescription,
        modifier = modifier,
        contentScale = ContentScale.Fit,
        colorFilter = tint?.let(ColorFilter::tint),
    )
}

@Composable
fun PopApprovedAvatar(url: String?, name: String?, size: Dp, modifier: Modifier = Modifier) {
    Surface(modifier.size(size).clip(CircleShape), shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant) {
        if (!url.isNullOrBlank()) {
            AsyncImage(url, name, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        } else {
            Box(Modifier.fillMaxSize().padding(size * .2f), contentAlignment = Alignment.Center) {
                PopApprovedAsset(R.drawable.pop_approved_section_basic, name, Modifier.fillMaxSize())
            }
        }
    }
}

@Composable
fun PopActiveProfileHeader(
    name: String?,
    subtitle: String?,
    avatarUrl: String?,
    onSwitchProfile: () -> Unit,
    onNotifications: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Row(modifier.fillMaxWidth().heightIn(min = 92.dp), verticalAlignment = Alignment.CenterVertically) {
        PopApprovedAvatar(avatarUrl, name, 88.dp)
        Column(
            Modifier.weight(1f).clickable(role = Role.Button, onClick = onSwitchProfile).padding(horizontal = 14.dp, vertical = 6.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(name.orEmpty(), style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                PopApprovedAsset(
                    R.drawable.pop_approved_chevron,
                    null,
                    Modifier.size(29.dp).rotate(90f),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(subtitle.orEmpty(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }
        if (onNotifications != null) {
            Box(Modifier.size(48.dp).clickable(role = Role.Button, onClick = onNotifications), contentAlignment = Alignment.Center) {
                PopApprovedAsset(R.drawable.pop_approved_menu_notifications, null, Modifier.size(24.dp), tint = MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}
