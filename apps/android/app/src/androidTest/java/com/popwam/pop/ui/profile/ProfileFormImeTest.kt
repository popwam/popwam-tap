package com.popwam.pop.ui.profile

import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performImeAction
import androidx.compose.ui.test.performTextInput
import com.popwam.pop.ui.components.PopFormLayout
import com.popwam.pop.ui.components.PopFormTags
import com.popwam.pop.ui.components.PopFormTextField
import org.junit.Rule
import org.junit.Test

class ProfileFormImeTest {
    @get:Rule val compose=createComposeRule()

    @Test fun lowerFocusedField_andPinnedAction_remainReachable() {
        compose.setContent {
            MaterialTheme {
                PopFormLayout(
                    action={focus->Button({focus.focus("last-field")},Modifier.testTag("focus-last")){Text("Focus last")}},
                ){focus->
                    repeat(12){index->
                        var value by remember(index){mutableStateOf("")}
                        PopFormTextField("field-$index",focus,value,{value=it},label={Text("Field $index")},nextFieldKey="field-${index+1}")
                    }
                    var finalValue by remember{mutableStateOf("")}
                    PopFormTextField("last-field",focus,finalValue,{finalValue=it},label={Text("Last field")})
                }
            }
        }
        compose.onNodeWithTag("focus-last").performClick()
        compose.waitForIdle()
        compose.onNodeWithTag(PopFormTags.field("last-field")).assertIsDisplayed()
        compose.onNodeWithTag(PopFormTags.ACTIONS).assertIsDisplayed()
    }

    @Test fun nextImeAction_movesToLogicalField() {
        compose.setContent {
            MaterialTheme {
                PopFormLayout{focus->
                    var first by remember{mutableStateOf("")};var second by remember{mutableStateOf("")}
                    PopFormTextField("first",focus,first,{first=it},label={Text("First")},nextFieldKey="second")
                    PopFormTextField("second",focus,second,{second=it},label={Text("Second")})
                }
            }
        }
        val first=compose.onNodeWithTag(PopFormTags.field("first"))
        first.performClick()
        first.performTextInput("value")
        first.performImeAction()
        compose.waitForIdle()
        compose.onNodeWithTag(PopFormTags.field("second")).assertIsFocused()
    }
}
