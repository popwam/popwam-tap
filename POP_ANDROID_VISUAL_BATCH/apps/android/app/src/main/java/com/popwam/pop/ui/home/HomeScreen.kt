package com.popwam.pop.ui.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.BusinessCenter
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.popwam.pop.R
import com.popwam.pop.ui.components.PopActiveProfileHeader
import com.popwam.pop.ui.components.PopApprovedAsset
import com.popwam.pop.ui.components.PopBrandedLoading

@Composable
fun HomeRoute(
    viewModel: HomeViewModel,
    navigate: (HomeDestination) -> Unit,
    onSessionExpired: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is HomeEffect.Navigate -> navigate(effect.destination)
                HomeEffect.SessionExpired -> onSessionExpired()
            }
        }
    }
    HomeScreen(state, viewModel::onEvent)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(state: HomeUiState, onEvent: (HomeEvent) -> Unit, modifier: Modifier = Modifier) {
    when (state.loadState) {
        HomeLoadState.INITIAL_LOADING -> HomeLoading(modifier)
        HomeLoadState.ERROR -> HomeFailure({ onEvent(HomeEvent.Retry) }, modifier)
        HomeLoadState.EMPTY -> EmptyHome({ onEvent(HomeEvent.AddProfile) }, modifier)
        HomeLoadState.CONTENT -> LoadedHome(state, onEvent, modifier)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LoadedHome(state: HomeUiState, onEvent: (HomeEvent) -> Unit, modifier: Modifier) {
    var profilePicker by remember { mutableStateOf(false) }

    PullToRefreshBox(
        isRefreshing = state.isRefreshing,
        onRefresh = { onEvent(HomeEvent.Refresh) },
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        BoxWithConstraints(Modifier.fillMaxSize()) {
            val pageHorizontalPadding = if (maxWidth < 380.dp) 16.dp else 30.dp
            val headerOuterPadding = if (maxWidth < 380.dp) 0.dp else 14.dp
            val searchActive = state.searchQuery.trim().length >= 2

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(top = 5.dp, bottom = 16.dp),
            ) {
                item {
                    Box(Modifier.padding(horizontal = headerOuterPadding)) {
                        HomeHeader(
                            profile = state.activeProfile,
                            openProfiles = { profilePicker = true },
                            notifications = { onEvent(HomeEvent.Notifications) },
                        )
                    }
                }

                item { Spacer(Modifier.height(13.dp)) }

                if (state.isPartial || state.errorCode != null) {
                    item {
                        Box(Modifier.padding(horizontal = pageHorizontalPadding)) {
                            PartialHomeBanner { onEvent(HomeEvent.Retry) }
                        }
                    }
                    item { Spacer(Modifier.height(8.dp)) }
                }

                item {
                    HomeSearch(
                        value = state.searchQuery,
                        loading = state.searchLoading,
                        onValueChange = { onEvent(HomeEvent.SearchChanged(it)) },
                        modifier = Modifier.padding(horizontal = pageHorizontalPadding),
                    )
                }

                if (searchActive) {
                    item { Spacer(Modifier.height(10.dp)) }

                    if (state.searchError != null) {
                        item {
                            Text(
                                text = stringResource(R.string.home_search_unavailable),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = pageHorizontalPadding),
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }

                    if (
                        state.searchAttempted &&
                        state.searchProfiles.isEmpty() &&
                        state.searchServices.isEmpty()
                    ) {
                        item {
                            Text(
                                text = stringResource(R.string.home_search_empty),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = pageHorizontalPadding, vertical = 16.dp),
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }

                    items(state.searchProfiles, key = { "profile-${it.id}" }) { result ->
                        Box(
                            Modifier.padding(
                                start = pageHorizontalPadding,
                                end = pageHorizontalPadding,
                                bottom = 8.dp,
                            ),
                        ) {
                            DiscoveryResultCard(
                                name = result.name,
                                subtitle = result.title,
                                imageUrl = result.imageUrl,
                                kind = stringResource(
                                    if (result.kind == "BUSINESS") {
                                        R.string.home_search_business
                                    } else {
                                        R.string.home_search_person
                                    },
                                ),
                            ) {
                                onEvent(HomeEvent.OpenPublicProfile(result.slug))
                            }
                        }
                    }

                    items(state.searchServices, key = { "service-${it.id}" }) { result ->
                        Box(
                            Modifier.padding(
                                start = pageHorizontalPadding,
                                end = pageHorizontalPadding,
                                bottom = 8.dp,
                            ),
                        ) {
                            DiscoveryResultCard(
                                name = result.name,
                                subtitle = result.profileName,
                                imageUrl = result.profileImageUrl,
                                kind = stringResource(R.string.home_search_service),
                            ) {
                                onEvent(HomeEvent.OpenPublicProfile(result.profileSlug))
                            }
                        }
                    }
                } else {
                    if (state.suggestedProfiles.isNotEmpty()) {
                        item { Spacer(Modifier.height(12.dp)) }
                        item {
                            SuggestedProfilesSection(
                                profiles = state.suggestedProfiles,
                                onOpen = { onEvent(HomeEvent.OpenPublicProfile(it)) },
                                modifier = Modifier.padding(horizontal = pageHorizontalPadding),
                            )
                        }
                    }

                    state.activeProfile?.let { profile ->
                        item { Spacer(Modifier.height(12.dp)) }
                        item {
                            ProfileCompletionCard(
                                profile = profile,
                                percent = state.completionPercent,
                                ready = state.profileReady,
                                onContinue = { onEvent(HomeEvent.OpenProfile(profile.id)) },
                                modifier = Modifier.padding(horizontal = pageHorizontalPadding),
                            )
                        }
                    }

                    if (state.services.isNotEmpty()) {
                        item { Spacer(Modifier.height(12.dp)) }
                        item {
                            DistinguishedServicesSection(
                                services = state.services,
                                onOpen = { onEvent(HomeEvent.OpenPublicProfile(it)) },
                                modifier = Modifier.padding(horizontal = pageHorizontalPadding),
                            )
                        }
                    }

                    if (state.activeProductCount > 0 || state.totalOpenCount > 0) {
                        item { Spacer(Modifier.height(12.dp)) }
                        item {
                            Box(Modifier.padding(horizontal = pageHorizontalPadding)) {
                                HomeActivitySummary(
                                    state.activeProductCount,
                                    state.totalOpenCount,
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (profilePicker) {
        ProfilePickerSheet(
            profiles = state.profiles,
            selectedId = state.activeProfileId,
            onSelect = {
                profilePicker = false
                onEvent(HomeEvent.SelectProfile(it))
            },
            onAdd = {
                profilePicker = false
                onEvent(HomeEvent.AddProfile)
            },
            onDismiss = { profilePicker = false },
        )
    }
}

@Composable
private fun HomeHeader(profile: HomeProfile?, openProfiles: () -> Unit, notifications: () -> Unit) {
    PopActiveProfileHeader(
        name = profile?.name ?: stringResource(R.string.app_name),
        subtitle = profile?.subtitle ?: stringResource(R.string.active_profile),
        avatarUrl = profile?.avatarUrl,
        onSwitchProfile = openProfiles,
        onNotifications = notifications,
    )
}

@Composable
private fun HomeSearch(
    value: String,
    loading: Boolean,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val primaryText = Color(0xFF111817)
    val secondaryText = Color(0xFF52605E)
    val divider = Color(0xFFC2CCCA)

    Column(modifier = modifier.fillMaxWidth()) {
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier
                .fillMaxWidth()
                .height(40.dp),
            singleLine = true,
            textStyle = MaterialTheme.typography.bodyMedium.copy(color = primaryText),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(),
            decorationBox = { innerTextField ->
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(start = 10.dp, end = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier.weight(1f),
                        contentAlignment = Alignment.CenterStart,
                    ) {
                        if (value.isBlank()) {
                            Text(
                                text = stringResource(R.string.home_search_hint),
                                style = MaterialTheme.typography.bodyMedium,
                                color = secondaryText,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                        innerTextField()
                    }

                    Spacer(Modifier.width(8.dp))

                    if (loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = Color(0xFF0EA5A4),
                        )
                    } else {
                        PopApprovedAsset(
                            drawable = R.drawable.pop_figma_home_search,
                            contentDescription = null,
                            modifier = Modifier.size(24.dp),
                        )
                    }
                }
            },
        )

        HorizontalDivider(
            thickness = 1.dp,
            color = divider,
        )
    }
}

@Composable
private fun SuggestedProfilesSection(
    profiles: List<com.popwam.pop.data.api.DiscoveryProfileDto>,
    onOpen: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    HomeHorizontalDiscoverySection(
        title = stringResource(R.string.home_suggested),
        modifier = modifier,
    ) {
        items(profiles, key = { "suggested-${it.id}" }) { profile ->
            HomeDiscoveryCard(
                name = profile.name,
                subtitle = profile.title,
                imageUrl = profile.imageUrl,
                actionLabel = stringResource(R.string.open),
                onClick = { onOpen(profile.slug) },
            )
        }
    }
}

@Composable
private fun DistinguishedServicesSection(
    services: List<com.popwam.pop.data.api.DiscoveryServiceDto>,
    onOpen: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    HomeHorizontalDiscoverySection(
        title = stringResource(R.string.home_distinguished_services),
        modifier = modifier,
    ) {
        items(services, key = { "distinguished-${it.id}" }) { service ->
            HomeDiscoveryCard(
                name = service.name,
                subtitle = service.profileName,
                imageUrl = service.profileImageUrl,
                actionLabel = stringResource(R.string.open),
                onClick = { onOpen(service.profileSlug) },
            )
        }
    }
}

@Composable
private fun HomeHorizontalDiscoverySection(
    title: String,
    modifier: Modifier = Modifier,
    content: androidx.compose.foundation.lazy.LazyListScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .height(203.dp)
            .padding(top = 16.dp),
    ) {
        Text(
            text = title.uppercase(),
            modifier = Modifier
                .padding(start = 10.dp)
                .semantics { heading() },
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF111817),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )

        Spacer(Modifier.height(13.dp))

        LazyRow(
            modifier = Modifier
                .fillMaxWidth()
                .height(118.dp),
            contentPadding = PaddingValues(start = 10.dp, end = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            content = content,
        )
    }
}

@Composable
private fun HomeDiscoveryCard(
    name: String,
    subtitle: String?,
    imageUrl: String?,
    actionLabel: String,
    onClick: () -> Unit,
) {
    Surface(
        modifier = Modifier
            .width(76.dp)
            .height(118.dp)
            .clickable(role = Role.Button, onClick = onClick),
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFFEEF3F2),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 7.dp, bottom = 5.dp, start = 4.dp, end = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            HomeDiscoveryAvatar(
                url = imageUrl,
                name = name,
            )

            Spacer(Modifier.height(4.dp))

            Text(
                text = name,
                modifier = Modifier.fillMaxWidth(),
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF111817),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
            )

            Text(
                text = subtitle.orEmpty(),
                modifier = Modifier.fillMaxWidth(),
                style = MaterialTheme.typography.labelSmall,
                color = Color(0xFF7A8785),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.weight(1f))

            Surface(
                shape = RoundedCornerShape(4.dp),
                color = Color(0xFF0EA5A4),
            ) {
                Text(
                    text = actionLabel,
                    modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White,
                    maxLines = 1,
                )
            }
        }
    }
}

@Composable
private fun HomeDiscoveryAvatar(
    url: String?,
    name: String?,
) {
    Box(
        modifier = Modifier
            .size(50.dp)
            .clip(RoundedCornerShape(5.dp))
            .background(Color(0xFFF3F4F6)),
        contentAlignment = Alignment.Center,
    ) {
        if (!url.isNullOrBlank()) {
            AsyncImage(
                model = url,
                contentDescription = name,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
        } else {
            PopApprovedAsset(
                drawable = R.drawable.pop_figma_home_avatar_placeholder,
                contentDescription = name,
                modifier = Modifier.fillMaxSize(),
            )
        }
    }
}

@Composable private fun DiscoveryResultCard(name:String,subtitle:String?,imageUrl:String?,kind:String,onClick:()->Unit){
    Surface(Modifier.fillMaxWidth().clickable(role=Role.Button,onClick=onClick),shape=RoundedCornerShape(16.dp),color=MaterialTheme.colorScheme.surface,border=BorderStroke(1.dp,MaterialTheme.colorScheme.outline.copy(alpha=.6f))){
        Row(Modifier.fillMaxWidth().padding(12.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)){
            ProfileAvatar(imageUrl,name,Modifier.size(48.dp));Column(Modifier.weight(1f)){Text(name,style=MaterialTheme.typography.titleSmall);subtitle?.takeIf(String::isNotBlank)?.let{Text(it,style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant)}};Text(kind,style=MaterialTheme.typography.labelSmall,color=MaterialTheme.colorScheme.primary);Icon(Icons.AutoMirrored.Filled.ArrowForward,null,tint=MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun HomeSectionTitle(text: String) {
    Text(text, Modifier.fillMaxWidth().padding(top = 2.dp).semantics { heading() }, style = MaterialTheme.typography.titleMedium)
}

@Composable
private fun DiscoveryBoundary(text: String, icon: androidx.compose.ui.graphics.vector.ImageVector = Icons.Default.Person, onClick: (() -> Unit)? = null) {
    val clickable = if (onClick == null) Modifier else Modifier.clickable(role = Role.Button, onClick = onClick)
    Surface(
        modifier = Modifier.fillMaxWidth().then(clickable),
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.size(44.dp)) {
                Box(contentAlignment = Alignment.Center) { Icon(icon, null, tint = MaterialTheme.colorScheme.onPrimaryContainer) }
            }
            Text(text, Modifier.weight(1f).padding(horizontal = 12.dp), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (onClick != null) Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ProfileCompletionCard(
    profile: HomeProfile,
    percent: Int?,
    ready: Boolean,
    onContinue: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val completion = if (ready) 100 else (percent ?: 0).coerceIn(0, 100)
    val progress = completion / 100f
    val teal = Color(0xFF0EA5A4)
    val primaryText = Color(0xFF111817)
    val secondaryText = Color(0xFF52605E)

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 150.dp),
        shape = RoundedCornerShape(4.dp),
        color = Color(0xFFF7F9F9),
    ) {
        BoxWithConstraints {
            val compact = maxWidth < 320.dp
            val completionSize = if (compact) 68.dp else 79.dp
            val contentGap = if (compact) 10.dp else 15.dp

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(
                        start = 12.dp,
                        end = 13.dp,
                        top = 17.dp,
                        bottom = 17.dp,
                    ),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Surface(
                    modifier = Modifier.size(completionSize),
                    shape = CircleShape,
                    color = Color(0xFFD9D9D9),
                    border = BorderStroke(4.dp, Color(0xFFEEF3F2)),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = "$completion%",
                            style = MaterialTheme.typography.titleSmall,
                            color = primaryText,
                        )
                    }
                }

                Spacer(Modifier.width(contentGap))

                Column(
                    modifier = Modifier.weight(1f),
                ) {
                    Text(
                        text = stringResource(
                            if (ready) R.string.home_profile_ready
                            else R.string.home_complete_profile,
                        ).uppercase(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = primaryText,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )

                    Spacer(Modifier.height(5.dp))

                    Text(
                        text = if (ready) {
                            stringResource(R.string.home_profile_ready_body, profile.name)
                        } else {
                            stringResource(R.string.home_complete_profile_body)
                        }.uppercase(),
                        style = MaterialTheme.typography.bodySmall,
                        color = primaryText,
                        maxLines = if (compact) 3 else 2,
                        overflow = TextOverflow.Ellipsis,
                    )

                    Spacer(Modifier.height(8.dp))

                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(4.dp),
                        shape = RoundedCornerShape(2.dp),
                        color = Color.White,
                        border = BorderStroke(1.dp, Color(0xFFC2CCCA)),
                    ) {
                        if (progress > 0f) {
                            Box(
                                Modifier
                                    .fillMaxWidth(progress)
                                    .fillMaxHeight()
                                    .background(teal),
                            )
                        }
                    }

                    Spacer(Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                    ) {
                        Surface(
                            modifier = Modifier
                                .width(if (compact) 88.dp else 95.dp)
                                .height(27.dp)
                                .clickable(role = Role.Button, onClick = onContinue),
                            shape = RoundedCornerShape(4.dp),
                            color = teal,
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = stringResource(
                                        if (ready) R.string.open
                                        else R.string.continue_label,
                                    ).uppercase(),
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color.White,
                                    maxLines = 1,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HomeActivitySummary(activeProducts: Int, opens: Int) {
    Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface, border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)) {
        Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(24.dp)) {
            HomeMetric(activeProducts.toString(), stringResource(R.string.active_cards), Modifier.weight(1f))
            HomeMetric(opens.toString(), stringResource(R.string.total_opens), Modifier.weight(1f))
        }
    }
}

@Composable
private fun HomeMetric(value: String, label: String, modifier: Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProfilePickerSheet(profiles: List<HomeProfile>, selectedId: String?, onSelect: (String) -> Unit, onAdd: () -> Unit, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.surface) {
        LazyColumn(contentPadding = PaddingValues(start = 24.dp, end = 24.dp, bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item { Text(stringResource(R.string.editor_select_profile), Modifier.padding(bottom = 8.dp).semantics { heading() }, style = MaterialTheme.typography.titleLarge) }
            items(profiles, key = { it.id }) { profile ->
                Surface(
                    Modifier.fillMaxWidth().clickable(role = Role.RadioButton) { onSelect(profile.id) },
                    shape = RoundedCornerShape(16.dp),
                    color = if (profile.id == selectedId) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, if (profile.id == selectedId) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline),
                ) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(selected = profile.id == selectedId, onClick = null)
                        ProfileAvatar(profile.avatarUrl, profile.name, Modifier.size(48.dp))
                        Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                            Text(profile.name, style = MaterialTheme.typography.titleSmall)
                            Text(profileLifecycleLabel(profile.lifecycle), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
            item { HorizontalDivider(Modifier.padding(vertical = 8.dp)) }
            item { OutlinedButton(onAdd, Modifier.fillMaxWidth().heightIn(min = 52.dp)) { Icon(Icons.Default.Add, null); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.editor_add_profile)) } }
        }
    }
}

@Composable
private fun profileLifecycleLabel(lifecycle: String) = stringResource(
    when (lifecycle.uppercase()) {
        "PUBLISHED", "ACTIVE" -> R.string.home_status_published
        "ARCHIVED" -> R.string.home_status_archived
        else -> R.string.home_status_draft
    },
)

@Composable
private fun ProfileAvatar(url: String?, name: String?, modifier: Modifier) {
    Box(modifier.clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
        if (!url.isNullOrBlank()) AsyncImage(url, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        else Icon(Icons.Default.Person, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun PartialHomeBanner(retry: () -> Unit) {
    Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.errorContainer) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.ErrorOutline, null, tint = MaterialTheme.colorScheme.onErrorContainer)
            Text(stringResource(R.string.home_partial), Modifier.weight(1f).padding(horizontal = 10.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onErrorContainer)
            androidx.compose.material3.TextButton(retry) { Text(stringResource(R.string.retry)) }
        }
    }
}

@Composable
private fun HomeLoading(modifier: Modifier) {
    PopBrandedLoading(modifier.background(MaterialTheme.colorScheme.background))
}

@Composable
private fun HomeFailure(retry: () -> Unit, modifier: Modifier) {
    Column(modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Icon(Icons.Default.ErrorOutline, null, Modifier.size(52.dp), tint = MaterialTheme.colorScheme.error)
        Spacer(Modifier.height(16.dp))
        Text(stringResource(R.string.home_error), style = MaterialTheme.typography.titleLarge)
        Text(stringResource(R.string.home_error_body), Modifier.padding(top = 8.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
        Button(retry, Modifier.padding(top = 20.dp).heightIn(min = 48.dp)) { Text(stringResource(R.string.retry)) }
    }
}

@Composable
private fun EmptyHome(add: () -> Unit, modifier: Modifier) {
    Column(modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Icon(Icons.Default.Person, null, Modifier.size(58.dp), tint = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.height(16.dp))
        Text(stringResource(R.string.no_active_profile), style = MaterialTheme.typography.titleLarge)
        Text(stringResource(R.string.home_empty_body), Modifier.padding(top = 8.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
        Button(add, Modifier.padding(top = 20.dp).heightIn(min = 48.dp)) { Icon(Icons.Default.Add, null); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.editor_add_profile)) }
    }
}