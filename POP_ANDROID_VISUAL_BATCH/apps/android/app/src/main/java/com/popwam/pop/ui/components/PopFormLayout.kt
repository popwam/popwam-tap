@file:OptIn(
    androidx.compose.foundation.ExperimentalFoundationApi::class,
    androidx.compose.foundation.layout.ExperimentalLayoutApi::class,
    androidx.compose.material3.ExperimentalMaterial3Api::class,
)

package com.popwam.pop.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.imeNestedScroll
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.union
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * One focus/relocation owner for a form. Fields register while composed, allowing
 * validation to move to the first invalid value without coupling validation to UI nodes.
 */
@Stable
class PopFormFocusController internal constructor(
    private val scope: CoroutineScope,
) {
    private data class Target(
        val focus: FocusRequester,
        val bringIntoView: BringIntoViewRequester,
    )

    private val targets = linkedMapOf<String, Target>()

    internal fun register(
        key: String,
        focus: FocusRequester,
        bringIntoView: BringIntoViewRequester,
    ) {
        targets[key] = Target(focus, bringIntoView)
    }

    internal fun unregister(key: String, focus: FocusRequester) {
        if (targets[key]?.focus === focus) targets.remove(key)
    }

    fun focus(key: String) {
        val target = targets[key] ?: return
        scope.launch {
            target.focus.requestFocus()
            withFrameNanos { }
            target.bringIntoView.bringIntoView()
        }
    }
}

@Composable
fun rememberPopFormFocusController(): PopFormFocusController {
    val scope = rememberCoroutineScope()
    return remember(scope) { PopFormFocusController(scope) }
}

/**
 * Keyboard-safe form body with a bottom action area that remains above the IME.
 * Insets are a union, so the navigation bar is not added twice while the IME is visible.
 */
@Composable
fun PopFormLayout(
    modifier: Modifier = Modifier,
    firstInvalidField: String? = null,
    focusController: PopFormFocusController = rememberPopFormFocusController(),
    action: (@Composable ColumnScope.(PopFormFocusController) -> Unit)? = null,
    content: @Composable ColumnScope.(PopFormFocusController) -> Unit,
) {
    val bottomInsets = WindowInsets.navigationBars
        .union(WindowInsets.ime)
        .only(WindowInsetsSides.Bottom)

    LaunchedEffect(firstInvalidField) {
        firstInvalidField?.let(focusController::focus)
    }

    Column(modifier.fillMaxSize().testTag(PopFormTags.ROOT)) {
        Column(
            Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .imeNestedScroll()
                .padding(horizontal = 20.dp, vertical = 16.dp)
                .testTag(PopFormTags.CONTENT),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            content(focusController)
        }
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = if (action == null) 0.dp else 8.dp,
        ) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .windowInsetsPadding(bottomInsets)
                    .then(
                        if (action == null) Modifier
                        else Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                    )
                    .testTag(PopFormTags.ACTIONS),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                action?.invoke(this, focusController)
            }
        }
    }
}

/** A full-height, scrollable form sheet; no fixed keyboard height assumptions. */
@Composable
fun PopFormSheet(
    onDismissRequest: () -> Unit,
    title: @Composable () -> Unit,
    firstInvalidField: String? = null,
    action: @Composable ColumnScope.(PopFormFocusController) -> Unit,
    content: @Composable ColumnScope.(PopFormFocusController) -> Unit,
) {
    val focusController = rememberPopFormFocusController()
    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
    ) {
        Column(Modifier.fillMaxWidth().fillMaxHeight(.92f)) {
            Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp)) {
                title()
            }
            PopFormLayout(
                modifier = Modifier.weight(1f),
                firstInvalidField = firstInvalidField,
                focusController = focusController,
                action = action,
                content = content,
            )
        }
    }
}

/**
 * Standard form field. Only the editable value is forced LTR; labels continue to
 * follow the screen direction, which preserves Arabic form composition.
 */
@Composable
fun PopFormTextField(
    fieldKey: String,
    focusController: PopFormFocusController,
    value: String,
    onValueChange: (String) -> Unit,
    label: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    nextFieldKey: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = if (nextFieldKey == null) ImeAction.Done else ImeAction.Next,
    singleLine: Boolean = true,
    minLines: Int = 1,
    maxLines: Int = if (singleLine) 1 else Int.MAX_VALUE,
    enabled: Boolean = true,
    valueIsLtr: Boolean = false,
    isError: Boolean = false,
    supportingText: (@Composable () -> Unit)? = null,
    prefix: (@Composable () -> Unit)? = null,
) {
    val focusRequester = remember(fieldKey) { FocusRequester() }
    val bringIntoViewRequester = remember(fieldKey) { BringIntoViewRequester() }
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current
    val density = LocalDensity.current
    val imeBottom = WindowInsets.ime.getBottom(density)
    var focused by remember(fieldKey) { mutableStateOf(false) }

    DisposableEffect(fieldKey, focusRequester, bringIntoViewRequester) {
        focusController.register(fieldKey, focusRequester, bringIntoViewRequester)
        onDispose { focusController.unregister(fieldKey, focusRequester) }
    }
    LaunchedEffect(focused, imeBottom, value.length) {
        if (focused) {
            withFrameNanos { }
            bringIntoViewRequester.bringIntoView()
        }
    }

    Column(
        modifier
            .fillMaxWidth()
            .bringIntoViewRequester(bringIntoViewRequester),
    ) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(focusRequester)
                .onFocusChanged { focused = it.isFocused }
                .testTag(PopFormTags.field(fieldKey)),
            label = label,
            prefix = prefix,
            keyboardOptions = KeyboardOptions(
                keyboardType = keyboardType,
                imeAction = imeAction,
            ),
            keyboardActions = KeyboardActions(
                onNext = {
                    nextFieldKey?.let(focusController::focus) ?: focusManager.clearFocus()
                },
                onDone = {
                    keyboardController?.hide()
                    focusManager.clearFocus()
                },
            ),
            singleLine = singleLine,
            minLines = minLines,
            maxLines = maxLines,
            enabled = enabled,
            isError = isError,
            supportingText = supportingText,
            textStyle = if (valueIsLtr) {
                MaterialTheme.typography.bodyLarge.merge(TextStyle(textDirection = TextDirection.Ltr))
            } else {
                MaterialTheme.typography.bodyLarge
            },
        )
    }
}

@Composable
fun PopLtrPrefix(value: String) {
    androidx.compose.runtime.CompositionLocalProvider(
        LocalLayoutDirection provides LayoutDirection.Ltr,
    ) {
        Text(value)
    }
}

object PopFormTags {
    const val ROOT = "pop-form-root"
    const val CONTENT = "pop-form-content"
    const val ACTIONS = "pop-form-actions"
    fun field(key: String) = "pop-form-field-$key"
}

object PopFormImePolicy {
    fun bottomInset(navigationBar:Int,ime:Int)=maxOf(navigationBar,ime)
    fun imeAction(singleLine:Boolean,hasNext:Boolean)=when{
        !singleLine->ImeAction.Default
        hasNext->ImeAction.Next
        else->ImeAction.Done
    }
    fun shouldRelocate(focused:Boolean)=focused
}
