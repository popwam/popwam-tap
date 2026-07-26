package com.popwam.pop.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.popwam.pop.R
import com.popwam.pop.data.api.BlockedUserDto
import com.popwam.pop.data.api.FriendDto
import com.popwam.pop.data.api.FriendIdentityDto
import com.popwam.pop.data.api.FriendRequestDto
import com.popwam.pop.data.api.FriendSearchResultDto

private enum class FriendsTab { FRIENDS, REQUESTS, SEARCH, PRIVACY, BLOCKED }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendsScreen(state: MainUiState, vm: MainViewModel, initialTab: String = "friends") {
    val locale = currentLocale()
    val context = LocalContext.current
    var tab by rememberSaveable {
        mutableStateOf(
            when (initialTab) {
                "requests" -> FriendsTab.REQUESTS
                "search" -> FriendsTab.SEARCH
                "privacy" -> FriendsTab.PRIVACY
                "blocked" -> FriendsTab.BLOCKED
                else -> FriendsTab.FRIENDS
            },
        )
    }
    var actionPerson by remember { mutableStateOf<FriendIdentityDto?>(null) }
    var actionFriend by remember { mutableStateOf<FriendDto?>(null) }
    var reportPerson by remember { mutableStateOf<FriendIdentityDto?>(null) }
    var blockPerson by remember { mutableStateOf<FriendIdentityDto?>(null) }
    var removePerson by remember { mutableStateOf<FriendIdentityDto?>(null) }
    var reportedPerson by remember { mutableStateOf<FriendIdentityDto?>(null) }

    LaunchedEffect(locale) {
        vm.friendsViewed()
        vm.loadFriends(locale)
    }

    when (state.friendsStage) {
        FriendsStage.LOADING -> FriendsLoading()
        FriendsStage.POLICY_UNAVAILABLE -> FriendsGate(
            title = stringResource(R.string.friends_policy_title),
            help = stringResource(R.string.friends_policy_unavailable),
            read = { openWeb(context, "community-guidelines") },
            retry = { vm.loadFriends(locale) },
        )
        FriendsStage.POLICY_REQUIRED -> FriendsGate(
            title = stringResource(R.string.friends_policy_title),
            help = stringResource(R.string.friends_policy_help),
            read = { openWeb(context, "community-guidelines") },
            accept = { vm.acceptFriendsPolicy(locale) },
        )
        FriendsStage.SOCIAL_PROFILE_REQUIRED -> SocialProfileGate(state, vm, locale)
        FriendsStage.PRIVACY_REQUIRED -> FirstFriendsPrivacyGate(state, vm, locale)
        FriendsStage.ERROR -> FriendsGate(
            title = stringResource(R.string.friends_title),
            help = stringResource(R.string.friends_action_failed),
            retry = { vm.loadFriends(locale) },
        )
        FriendsStage.READY -> Column(Modifier.fillMaxSize()) {
            FriendsHeader(state.incomingFriendRequestCount) { vm.loadFriends(locale) }
            FriendsTabs(tab) { tab = it }
            if (state.loading) LinearProgressIndicator(Modifier.fillMaxWidth())
            when (tab) {
                FriendsTab.FRIENDS -> FriendsList(state, { friend ->
                    actionFriend = friend
                    actionPerson = FriendIdentityDto(friend.key, friend.profile)
                })
                FriendsTab.REQUESTS -> RequestsList(state, vm, locale, { reportPerson = it }, { blockPerson = it })
                FriendsTab.SEARCH -> FriendSearch(state, vm, locale, { reportPerson = it }, { blockPerson = it })
                FriendsTab.PRIVACY -> FriendsPrivacy(state, vm, locale)
                FriendsTab.BLOCKED -> BlockedList(state.blockedUsers) { vm.unblockUser(it, locale) }
            }
        }
    }

    val selectedFriend = actionFriend
    val selectedPerson = actionPerson
    if (selectedFriend != null && selectedPerson != null) ModalBottomSheet(onDismissRequest = {
        actionFriend = null
        actionPerson = null
    }) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(selectedPerson.profile.name, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
            FriendSheetAction(if (selectedFriend.favorite) R.string.friends_unfavorite else R.string.friends_favorite, Icons.Default.Star) {
                vm.updateFriendPreference(selectedFriend, favorite = !selectedFriend.favorite, locale = locale)
                actionFriend = null; actionPerson = null
            }
            FriendSheetAction(if (selectedFriend.muted) R.string.friends_unmute else R.string.friends_mute, Icons.Default.NotificationsOff) {
                vm.updateFriendPreference(selectedFriend, muted = !selectedFriend.muted, locale = locale)
                actionFriend = null; actionPerson = null
            }
            FriendSheetAction(R.string.friends_report, Icons.Default.Report) {
                reportPerson = selectedPerson
                actionFriend = null; actionPerson = null
            }
            FriendSheetAction(R.string.friends_remove, Icons.Default.PersonRemove) {
                removePerson = selectedPerson
                actionFriend = null; actionPerson = null
            }
            FriendSheetAction(R.string.friends_block, Icons.Default.Block, destructive = true) {
                blockPerson = selectedPerson
                actionFriend = null; actionPerson = null
            }
            Spacer(Modifier.height(20.dp))
        }
    }

    reportPerson?.let { person ->
        ReportSheet(person, state.loading, {
            reportPerson = null
        }) { category, details ->
            vm.reportUser(person, category, details, locale) {
                reportPerson = null
                reportedPerson = person
            }
        }
    }
    blockPerson?.let { person ->
        AlertDialog(
            onDismissRequest = { blockPerson = null },
            icon = { Icon(Icons.Default.Block, null) },
            title = { Text(stringResource(R.string.friends_block_title)) },
            text = { Text(stringResource(R.string.friends_block_confirm)) },
            confirmButton = { TextButton({
                vm.blockUser(person, locale)
                blockPerson = null
            }, colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Text(stringResource(R.string.friends_block)) } },
            dismissButton = { TextButton({ blockPerson = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
    removePerson?.let { person ->
        AlertDialog(
            onDismissRequest = { removePerson = null },
            title = { Text(stringResource(R.string.friends_remove_title)) },
            text = { Text(stringResource(R.string.friends_remove_confirm)) },
            confirmButton = { TextButton({
                vm.removeFriend(person, locale)
                removePerson = null
            }) { Text(stringResource(R.string.friends_remove)) } },
            dismissButton = { TextButton({ removePerson = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
    reportedPerson?.let { person ->
        AlertDialog(
            onDismissRequest = { reportedPerson = null },
            icon = { Icon(Icons.Default.CheckCircle, null, tint = MaterialTheme.colorScheme.primary) },
            title = { Text(stringResource(R.string.friends_report_received)) },
            text = { Text(stringResource(R.string.friends_report_received_help)) },
            confirmButton = { TextButton({
                reportedPerson = null
                blockPerson = person
            }) { Text(stringResource(R.string.friends_block_user)) } },
            dismissButton = { TextButton({ reportedPerson = null }) { Text(stringResource(R.string.close)) } },
        )
    }
}

@Composable
private fun FriendsHeader(count: Int, refresh: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(stringResource(R.string.friends_title), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
            Text(stringResource(R.string.friends_description), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (count > 0) Badge { Text(count.toString()) }
        IconButton(refresh, Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp)) { Icon(Icons.Default.Refresh, stringResource(R.string.retry)) }
    }
}

@Composable
private fun FriendsTabs(selected: FriendsTab, change: (FriendsTab) -> Unit) {
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        listOf(
            FriendsTab.FRIENDS to R.string.friends_tab_friends,
            FriendsTab.REQUESTS to R.string.friends_tab_requests,
            FriendsTab.SEARCH to R.string.friends_tab_search,
            FriendsTab.PRIVACY to R.string.friends_tab_privacy,
            FriendsTab.BLOCKED to R.string.friends_tab_blocked,
        ).forEach { (tab, label) ->
            FilterChip(selected = selected == tab, onClick = { change(tab) }, label = { Text(stringResource(label)) })
        }
    }
}

@Composable
private fun FriendsList(state: MainUiState, actions: (FriendDto) -> Unit) {
    var filter by rememberSaveable { mutableStateOf("") }
    val visible = state.friends.filter { "${it.profile.name} ${it.profile.title.orEmpty()}".contains(filter.trim(), ignoreCase = true) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        if (state.friends.isNotEmpty()) item {
            OutlinedTextField(filter, { filter = it.take(64) }, Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.friends_search_current)) }, singleLine = true, leadingIcon = { Icon(Icons.Default.Search, null) })
        }
        if (visible.isEmpty()) item { FriendsEmpty(if(state.friends.isEmpty())R.string.friends_empty else R.string.friends_no_results, if(state.friends.isEmpty())R.string.friends_empty_help else null, Icons.Default.People) }
        items(visible, key = { it.key }) { friend ->
            FriendCard(FriendIdentityDto(friend.key, friend.profile), trailing = {
                if (friend.favorite) Icon(Icons.Default.Star, stringResource(R.string.friends_favorite), tint = Color(0xFFD4AF37))
                IconButton({ actions(friend) }, Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp)) { Icon(Icons.Default.MoreVert, stringResource(R.string.friends_actions)) }
            })
        }
    }
}

@Composable
private fun RequestsList(
    state: MainUiState,
    vm: MainViewModel,
    locale: String,
    report: (FriendIdentityDto) -> Unit,
    block: (FriendIdentityDto) -> Unit,
) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        if (state.friendRequests.isEmpty()) item { FriendsEmpty(R.string.friends_no_requests, null, Icons.Default.PersonAdd) }
        items(state.friendRequests, key = { it.id }) { request ->
            RequestCard(request, state.loading, {
                if (request.direction == "INCOMING") vm.respondFriendRequest(request, true, locale) else vm.cancelFriendRequest(request, locale)
            }, {
                vm.respondFriendRequest(request, false, locale)
            }, { report(request.person) }, { block(request.person) })
        }
    }
}

@Composable
private fun FriendSearch(
    state: MainUiState,
    vm: MainViewModel,
    locale: String,
    report: (FriendIdentityDto) -> Unit,
    block: (FriendIdentityDto) -> Unit,
) {
    var query by rememberSaveable { mutableStateOf("") }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            OutlinedTextField(
                query,
                { query = it.take(64) },
                Modifier.fillMaxWidth(),
                label = { Text(stringResource(R.string.friends_search_hint)) },
                singleLine = true,
                leadingIcon = { Icon(Icons.Default.Search, null) },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { vm.searchFriends(query, locale) }),
                trailingIcon = { IconButton({ vm.searchFriends(query, locale) }) { Icon(Icons.Default.ArrowForward, stringResource(R.string.friends_search)) } },
            )
        }
        if (state.friendSearchResults.isEmpty() && query.isNotBlank()) item { FriendsEmpty(R.string.friends_no_results, null, Icons.Default.SearchOff) }
        items(state.friendSearchResults, key = { it.key }) { result ->
            SearchCard(result, state.loading, { vm.sendFriendRequest(result.key, locale) }, { report(FriendIdentityDto(result.key, result.profile)) }, { block(FriendIdentityDto(result.key, result.profile)) })
        }
    }
}

@Composable
private fun FriendsPrivacy(state: MainUiState, vm: MainViewModel, locale: String) {
    val settings = state.friendsSettings ?: return
    var selected by rememberSaveable { mutableStateOf(settings.preference.socialProfileSlug ?: settings.profiles.firstOrNull()?.slug.orEmpty()) }
    LaunchedEffect(settings.preference.socialProfileSlug) {
        selected = settings.preference.socialProfileSlug ?: settings.profiles.firstOrNull()?.slug.orEmpty()
    }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { FriendToggle(R.string.friends_allow_requests, settings.preference.allowFriendRequests) { vm.updateFriendsSettings(locale, allowRequests = it) } }
        item { FriendToggle(R.string.friends_discoverable, settings.preference.discoverableByProfileSearch) { vm.updateFriendsSettings(locale, discoverable = it) } }
        item { Text(stringResource(R.string.friends_privacy_help), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall) }
        item { SocialProfilePicker(settings.profiles, selected) { selected = it } }
        item { Button({ vm.updateFriendsSettings(locale, socialProfileSlug = selected) }, Modifier.fillMaxWidth().heightIn(min = 48.dp), enabled = selected.isNotBlank() && !state.loading) { Text(stringResource(R.string.save)) } }
    }
}

@Composable
private fun BlockedList(blocks: List<BlockedUserDto>, unblock: (BlockedUserDto) -> Unit) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        if (blocks.isEmpty()) item { FriendsEmpty(R.string.friends_no_blocked, null, Icons.Default.Block) }
        items(blocks, key = { it.id }) { item ->
            Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), tonalElevation = 1.dp) {
                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    item.person?.let { FriendIdentity(it, Modifier.weight(1f)) } ?: Text(stringResource(R.string.friends_unavailable), Modifier.weight(1f))
                    TextButton({ unblock(item) }, Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.friends_unblock)) }
                }
            }
        }
    }
}

@Composable
private fun FriendsGate(title: String, help: String, read: (() -> Unit)? = null, accept: (() -> Unit)? = null, retry: (() -> Unit)? = null) {
    Box(Modifier.fillMaxSize().padding(20.dp), contentAlignment = Alignment.Center) {
        Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp), tonalElevation = 2.dp) {
            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Icon(Icons.Default.Groups, null, Modifier.size(44.dp), tint = MaterialTheme.colorScheme.primary)
                Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
                Text(help, color = MaterialTheme.colorScheme.onSurfaceVariant)
                read?.let { OutlinedButton(it, Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(stringResource(R.string.friends_read_policy)) } }
                accept?.let { Button(it, Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(stringResource(R.string.friends_accept_policy)) } }
                retry?.let { Button(it, Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(stringResource(R.string.retry)) } }
            }
        }
    }
}

@Composable
private fun SocialProfileGate(state: MainUiState, vm: MainViewModel, locale: String) {
    val settings = state.friendsSettings ?: return
    var selected by rememberSaveable { mutableStateOf(settings.profiles.firstOrNull()?.slug.orEmpty()) }
    Box(Modifier.fillMaxSize().padding(20.dp), contentAlignment = Alignment.Center) {
        Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp), tonalElevation = 2.dp) {
            Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(stringResource(R.string.friends_choose_profile), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
                Text(stringResource(R.string.friends_choose_profile_help), color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (settings.profiles.isEmpty()) Text(stringResource(R.string.friends_publish_profile_first), color = MaterialTheme.colorScheme.error)
                else {
                    SocialProfilePicker(settings.profiles, selected) { selected = it }
                    Button({ vm.updateFriendsSettings(locale, socialProfileSlug = selected) }, Modifier.fillMaxWidth().heightIn(min = 48.dp), enabled = selected.isNotBlank() && !state.loading) { Text(stringResource(R.string.continue_label)) }
                }
            }
        }
    }
}

@Composable
private fun FirstFriendsPrivacyGate(state: MainUiState, vm: MainViewModel, locale: String) {
    val preference = state.friendsSettings?.preference ?: return
    var allowRequests by rememberSaveable { mutableStateOf(preference.allowFriendRequests) }
    var discoverable by rememberSaveable { mutableStateOf(preference.discoverableByProfileSearch) }
    Box(Modifier.fillMaxSize().padding(20.dp), contentAlignment = Alignment.Center) {
        Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp), tonalElevation = 2.dp) {
            Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(stringResource(R.string.friends_tab_privacy), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
                Text(stringResource(R.string.friends_privacy_help), color = MaterialTheme.colorScheme.onSurfaceVariant)
                FriendToggle(R.string.friends_allow_requests, allowRequests) { allowRequests = it }
                FriendToggle(R.string.friends_discoverable, discoverable) { discoverable = it }
                Button(
                    { vm.updateFriendsSettings(locale, allowRequests = allowRequests, discoverable = discoverable) },
                    Modifier.fillMaxWidth().heightIn(min = 48.dp),
                    enabled = !state.loading,
                ) { Text(stringResource(R.string.continue_label)) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SocialProfilePicker(profiles: List<com.popwam.pop.data.api.FriendsSocialProfileDto>, selected: String, change: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded, { expanded = !expanded }) {
        OutlinedTextField(
            profiles.firstOrNull { it.slug == selected }?.name.orEmpty(),
            {},
            Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth(),
            readOnly = true,
            label = { Text(stringResource(R.string.friends_social_profile)) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
        )
        ExposedDropdownMenu(expanded, { expanded = false }) {
            profiles.forEach { profile -> DropdownMenuItem({ Text(profile.name) }, {
                change(profile.slug)
                expanded = false
            }) }
        }
    }
}

@Composable
private fun FriendToggle(label: Int, checked: Boolean, change: (Boolean) -> Unit) {
    Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), tonalElevation = 1.dp) {
        Row(Modifier.fillMaxWidth().clickable { change(!checked) }.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(label), Modifier.weight(1f))
            Switch(checked, change)
        }
    }
}

@Composable
private fun FriendCard(person: FriendIdentityDto, trailing: @Composable () -> Unit) {
    Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), tonalElevation = 1.dp) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            FriendIdentity(person, Modifier.weight(1f))
            trailing()
        }
    }
}

@Composable
private fun FriendIdentity(person: FriendIdentityDto, modifier: Modifier = Modifier) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        if (person.profile.avatarUrl != null) AsyncImage(model = person.profile.avatarUrl, contentDescription = null, modifier = Modifier.size(48.dp))
        else Surface(Modifier.size(48.dp), shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
            Box(contentAlignment = Alignment.Center) { Text(person.profile.name.take(1).uppercase(), fontWeight = FontWeight.Black) }
        }
        Column(Modifier.weight(1f, fill = false)) {
            Text(person.profile.name, fontWeight = FontWeight.Bold, maxLines = 1)
            person.profile.title?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall, maxLines = 1) }
        }
    }
}

@Composable
private fun RequestCard(request: FriendRequestDto, loading: Boolean, primary: () -> Unit, decline: () -> Unit, report: () -> Unit, block: () -> Unit) {
    FriendCard(request.person) {
        Column(horizontalAlignment = Alignment.End) {
            Row {
                Button(primary, enabled = !loading) { Text(stringResource(if (request.direction == "INCOMING") R.string.friends_accept else R.string.friends_cancel)) }
                if (request.direction == "INCOMING") TextButton(decline, enabled = !loading) { Text(stringResource(R.string.friends_decline)) }
            }
            Row {
                TextButton(report) { Text(stringResource(R.string.friends_report)) }
                TextButton(block, colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Text(stringResource(R.string.friends_block)) }
            }
        }
    }
}

@Composable
private fun SearchCard(result: FriendSearchResultDto, loading: Boolean, request: () -> Unit, report: () -> Unit, block: () -> Unit) {
    var menu by remember { mutableStateOf(false) }
    FriendCard(FriendIdentityDto(result.key, result.profile)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            when (FriendsPolicy.publicRelationshipState(result.relationshipState)) {
                "NONE" -> Button(request, enabled = !loading) { Text(stringResource(R.string.friends_add)) }
                "FRIENDS" -> Text(stringResource(R.string.friends_state_friends), style = MaterialTheme.typography.labelLarge)
                "OUTGOING_PENDING" -> Text(stringResource(R.string.friends_state_requested), style = MaterialTheme.typography.labelLarge)
                "INCOMING_PENDING" -> Text(stringResource(R.string.friends_state_incoming), style = MaterialTheme.typography.labelLarge)
                else -> Text(stringResource(R.string.friends_unavailable), style = MaterialTheme.typography.labelLarge)
            }
            Box {
                IconButton({ menu = true }, Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp)) { Icon(Icons.Default.MoreVert, stringResource(R.string.friends_actions)) }
                DropdownMenu(menu, { menu = false }) {
                    DropdownMenuItem({ Text(stringResource(R.string.friends_report)) }, { menu = false; report() }, leadingIcon = { Icon(Icons.Default.Report, null) })
                    DropdownMenuItem({ Text(stringResource(R.string.friends_block)) }, { menu = false; block() }, leadingIcon = { Icon(Icons.Default.Block, null) })
                }
            }
        }
    }
}

@Composable
private fun FriendSheetAction(label: Int, icon: androidx.compose.ui.graphics.vector.ImageVector, destructive: Boolean = false, action: () -> Unit) {
    TextButton(action, Modifier.fillMaxWidth().heightIn(min = 52.dp), colors = ButtonDefaults.textButtonColors(contentColor = if (destructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface)) {
        Icon(icon, null)
        Spacer(Modifier.width(12.dp))
        Text(stringResource(label), Modifier.weight(1f))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReportSheet(person: FriendIdentityDto, loading: Boolean, close: () -> Unit, submit: (String, String) -> Unit) {
    var category by rememberSaveable { mutableStateOf("SPAM") }
    var details by rememberSaveable { mutableStateOf("") }
    var expanded by remember { mutableStateOf(false) }
    ModalBottomSheet(onDismissRequest = close) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).imePadding(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(stringResource(R.string.friends_report_title), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
            Text(person.profile.name, color = MaterialTheme.colorScheme.onSurfaceVariant)
            ExposedDropdownMenuBox(expanded, { expanded = !expanded }) {
                OutlinedTextField(
                    stringResource(reportCategoryLabel(category)),
                    {},
                    Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth(),
                    readOnly = true,
                    label = { Text(stringResource(R.string.friends_report_reason)) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                )
                ExposedDropdownMenu(expanded, { expanded = false }) {
                    FriendsPolicy.reportCategories.forEach { value -> DropdownMenuItem({ Text(stringResource(reportCategoryLabel(value))) }, {
                        category = value
                        expanded = false
                    }) }
                }
            }
            OutlinedTextField(details, { details = it.take(500) }, Modifier.fillMaxWidth().heightIn(min = 120.dp), label = { Text(stringResource(R.string.friends_report_details)) })
            Button({ submit(category, details) }, Modifier.fillMaxWidth().heightIn(min = 48.dp), enabled = !loading && FriendsPolicy.validReport(category, details)) { Text(stringResource(R.string.friends_submit_report)) }
            TextButton(close, Modifier.fillMaxWidth()) { Text(stringResource(R.string.cancel)) }
            Spacer(Modifier.height(18.dp))
        }
    }
}

private fun reportCategoryLabel(category: String) = when (category) {
    "SPAM" -> R.string.friends_report_spam
    "HARASSMENT" -> R.string.friends_report_harassment
    "IMPERSONATION" -> R.string.friends_report_impersonation
    "INAPPROPRIATE_CONTENT" -> R.string.friends_report_content
    "SCAM" -> R.string.friends_report_scam
    "PRIVACY" -> R.string.friends_report_privacy
    else -> R.string.friends_report_other
}

@Composable
private fun FriendsEmpty(title: Int, help: Int?, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp), tonalElevation = 1.dp) {
        Column(Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(icon, null, Modifier.size(40.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(stringResource(title), fontWeight = FontWeight.Bold)
            help?.let { Text(stringResource(it), color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    }
}

@Composable
private fun FriendsLoading() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
}
