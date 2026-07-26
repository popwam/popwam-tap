package com.popwam.pop.ui

import com.google.gson.JsonArray
import com.google.gson.JsonPrimitive
import com.popwam.pop.data.api.OnboardingConditionDto
import com.popwam.pop.data.api.OnboardingDefinitionDto
import com.popwam.pop.data.api.OnboardingOptionDto
import com.popwam.pop.data.api.OnboardingQuestionDto
import com.popwam.pop.data.api.OnboardingStepDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DynamicOnboardingPolicyTest {
    private val definition=OnboardingDefinitionDto(
        id="restaurant-v1",
        key="restaurant-v1",
        version=1,
        profileKind="BUSINESS",
        categoryKey="restaurant",
        steps=listOf(
            OnboardingStepDto(
                key="identity",
                title="Identity",
                questions=listOf(OnboardingQuestionDto(key="business_name",type="TEXT",label="Name",required=true)),
            ),
            OnboardingStepDto(
                key="branches",
                title="Branches",
                required=false,
                questions=listOf(
                    OnboardingQuestionDto(key="has_branches",type="BOOLEAN",label="Branches"),
                    OnboardingQuestionDto(
                        key="branch_address",
                        type="LOCATION",
                        label="Address",
                        required=true,
                        conditions=listOf(OnboardingConditionDto(sourceQuestionKey="has_branches",operator="IS_TRUE")),
                    ),
                ),
            ),
            OnboardingStepDto(
                key="services",
                title="Services",
                required=false,
                questions=listOf(OnboardingQuestionDto(
                    key="services",
                    type="MULTI_SELECT",
                    label="Services",
                    options=listOf(OnboardingOptionDto("delivery","Delivery"),OnboardingOptionDto("catering","Catering")),
                )),
            ),
        ),
    )

    @Test fun `fixed native registry handles approved controls and rejects unknown`() {
        assertEquals(OnboardingRenderControl.TEXT,onboardingRenderControl("PHONE"))
        assertEquals(OnboardingRenderControl.MULTI_SELECT,onboardingRenderControl("MULTI_SELECT"))
        assertEquals(OnboardingRenderControl.IMAGE_LATER,onboardingRenderControl("IMAGE"))
        assertEquals(OnboardingRenderControl.UNKNOWN,onboardingRenderControl("REMOTE_WIDGET"))
        assertTrue(onboardingQuestionTypeApproved("LOCATION"))
        assertFalse(onboardingQuestionTypeApproved("HTML"))
    }

    @Test fun `bounded branch responds only to server condition`() {
        val step=definition.steps[1]
        assertEquals(listOf("has_branches"),visibleOnboardingQuestions(step,mapOf("has_branches" to JsonPrimitive(false))).map { it.key })
        assertEquals(listOf("has_branches","branch_address"),visibleOnboardingQuestions(step,mapOf("has_branches" to JsonPrimitive(true))).map { it.key })
    }

    @Test fun `visible required and optional policy is deterministic`() {
        val step=definition.steps[1]
        assertTrue(missingRequiredOnboardingQuestions(step,mapOf("has_branches" to JsonPrimitive(false))).isEmpty())
        assertEquals(listOf("branch_address"),missingRequiredOnboardingQuestions(step,mapOf("has_branches" to JsonPrimitive(true))))
        assertTrue(missingRequiredOnboardingQuestions(step,mapOf("has_branches" to JsonPrimitive(true),"branch_address" to JsonPrimitive("Cairo"))).isEmpty())
    }

    @Test fun `progress uses current visible steps and server step key`() {
        assertEquals(OnboardingProgressDisplay(2,3,67),dynamicOnboardingProgress(definition,mapOf("has_branches" to JsonPrimitive(false)),"branches"))
        assertEquals("branches",visibleOnboardingSteps(definition,emptyMap())[1].key)
    }

    @Test fun `step save sends only current step answers`() {
        val answers=mapOf(
            "business_name" to JsonPrimitive("POP"),
            "has_branches" to JsonPrimitive(true),
            "branch_address" to JsonPrimitive("Cairo"),
            "services" to JsonArray().apply { add("delivery") },
        )
        assertEquals(setOf("has_branches","branch_address"),onboardingStepAnswerSubset(definition.steps[1],answers).keys)
    }

    @Test fun `retry and process resume remain server routed`() {
        assertEquals(AuthSetupStage.DYNAMIC_ONBOARDING,onboardingRetryStage(true))
        assertEquals(AuthSetupStage.AUTHENTICATED_CHECKING,onboardingRetryStage(false))
    }

    @Test fun `Arabic uses RTL while typed values stay policy data`() {
        assertTrue(onboardingUsesRtl("ar"))
        assertFalse(onboardingUsesRtl("en"))
    }

    @Test fun `Firebase state is not an onboarding input`() {
        val visibleWithoutFirebase=visibleOnboardingSteps(definition,mapOf("business_name" to JsonPrimitive("POP")))
        assertEquals(3,visibleWithoutFirebase.size)
    }
}
