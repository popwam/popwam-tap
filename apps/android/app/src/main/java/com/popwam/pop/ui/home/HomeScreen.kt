package com.popwam.pop.ui.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.popwam.pop.R
import com.popwam.pop.ui.components.PopActiveProfileHeader
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
        modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 30.dp, end = 30.dp, top = 22.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { HomeHeader(state.activeProfile, { profilePicker = true }, { onEvent(HomeEvent.Notifications) }) }
            if (state.isPartial || state.errorCode != null) item { PartialHomeBanner { onEvent(HomeEvent.Retry) } }
            item { HomeSearch(state.searchQuery, state.searchLoading) { onEvent(HomeEvent.SearchChanged(it)) } }
            if(state.searchQuery.trim().length>=2){
                if(state.searchError!=null)item{Text(stringResource(R.string.home_search_unavailable),color=MaterialTheme.colorScheme.error,style=MaterialTheme.typography.bodySmall)}
                if(state.searchAttempted&&state.searchProfiles.isEmpty()&&state.searchServices.isEmpty())item{Text(stringResource(R.string.home_search_empty),Modifier.fillMaxWidth().padding(vertical=16.dp),style=MaterialTheme.typography.bodyMedium,color=MaterialTheme.colorScheme.onSurfaceVariant)}
                items(state.searchProfiles,key={"profile-${it.id}"}){result->DiscoveryResultCard(result.name,result.title,result.imageUrl,stringResource(if(result.kind=="BUSINESS")R.string.home_search_business else R.string.home_search_person)){onEvent(HomeEvent.OpenPublicProfile(result.slug))}}
                items(state.searchServices,key={"service-${it.id}"}){result->DiscoveryResultCard(result.name,result.profileName,result.profileImageUrl,stringResource(R.string.home_search_service)){onEvent(HomeEvent.OpenPublicProfile(result.profileSlug))}}
            }
            state.activeProfile?.let { profile ->
                item { ProfileCompletionCard(profile, state.completionPercent, state.profileReady) { onEvent(HomeEvent.OpenProfile(profile.id)) } }
            }
            item { HomeSectionTitle(stringResource(R.string.home_suggested)) }
            item { Spacer(Modifier.height(4.dp)) }
            item { HomeSectionTitle(stringResource(R.string.home_distinguished_services)) }
            items(state.services,key={"discover-${it.id}"}){service->DiscoveryResultCard(service.name,service.profileName,service.profileImageUrl,stringResource(R.string.home_search_service)){onEvent(HomeEvent.OpenPublicProfile(service.profileSlug))}}
            if (state.activeProductCount > 0 || state.totalOpenCount > 0) {
                item { HomeActivitySummary(state.activeProductCount, state.totalOpenCount) }
            }
        }
    }
    if (profilePicker) {
        ProfilePickerSheet(
            profiles = state.profiles,
            selectedId = state.activeProfileId,
            onSelect = { profilePicker = false; onEvent(HomeEvent.SelectProfile(it)) },
            onAdd = { profilePicker = false; onEvent(HomeEvent.AddProfile) },
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
private fun HomeSearch(value:String,loading:Boolean,onValueChange:(String)->Unit) {
    OutlinedTextField(value,onValueChange,Modifier.fillMaxWidth(),singleLine=true,placeholder={Text(stringResource(R.string.home_search_hint))},leadingIcon={if(loading)CircularProgressIndicator(Modifier.size(20.dp),strokeWidth=2.dp)else Icon(Icons.Default.Search,null)},keyboardOptions=KeyboardOptions(imeAction=ImeAction.Search),keyboardActions=KeyboardActions(),shape=RoundedCornerShape(14.dp))
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
private fun ProfileCompletionCard(profile: HomeProfile, percent: Int?, ready: Boolean, onContinue: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.size(76.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    if (ready) Icon(Icons.Default.CheckCircle, stringResource(R.string.home_profile_ready), tint = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.size(36.dp))
                    else Text(percent?.let { "$it%" } ?: "—", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onPrimaryContainer)
                }
            }
            Column(Modifier.weight(1f).padding(start = 16.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                Text(if (ready) stringResource(R.string.home_profile_ready) else stringResource(R.string.home_complete_profile), style = MaterialTheme.typography.titleSmall)
                Text(
                    if (ready) stringResource(R.string.home_profile_ready_body, profile.name) else stringResource(R.string.home_complete_profile_body),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                OutlinedButton(onContinue, Modifier.align(Alignment.End).heightIn(min = 48.dp)) {
                    Text(stringResource(if (ready) R.string.open else R.string.continue_label))
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
