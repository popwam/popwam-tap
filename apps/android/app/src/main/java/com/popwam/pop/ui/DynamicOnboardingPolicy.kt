package com.popwam.pop.ui

import com.google.gson.JsonElement
import com.popwam.pop.data.api.OnboardingConditionDto
import com.popwam.pop.data.api.OnboardingDefinitionDto
import com.popwam.pop.data.api.OnboardingQuestionDto
import com.popwam.pop.data.api.OnboardingStepDto
import kotlin.math.roundToInt

enum class OnboardingRenderControl { TEXT, TEXTAREA, BOOLEAN, SINGLE_SELECT, MULTI_SELECT, IMAGE_LATER, UNKNOWN }

private val textQuestionTypes=setOf("TEXT","PHONE","EMAIL","URL","NUMBER","CURRENCY","LOCATION","TIME","DAY_HOURS")
private val approvedQuestionTypes=textQuestionTypes+setOf("TEXTAREA","BOOLEAN","SINGLE_SELECT","MULTI_SELECT","IMAGE")

fun onboardingRenderControl(type:String)=when(type) {
    in textQuestionTypes -> OnboardingRenderControl.TEXT
    "TEXTAREA" -> OnboardingRenderControl.TEXTAREA
    "BOOLEAN" -> OnboardingRenderControl.BOOLEAN
    "SINGLE_SELECT" -> OnboardingRenderControl.SINGLE_SELECT
    "MULTI_SELECT" -> OnboardingRenderControl.MULTI_SELECT
    "IMAGE" -> OnboardingRenderControl.IMAGE_LATER
    else -> OnboardingRenderControl.UNKNOWN
}

fun onboardingQuestionTypeApproved(type:String)=type in approvedQuestionTypes

private fun answerValues(answer:JsonElement?):List<String> {
    if(answer==null||answer.isJsonNull)return emptyList()
    if(answer.isJsonArray)return answer.asJsonArray.mapNotNull { runCatching { it.asString }.getOrNull() }
    return listOf(runCatching { answer.asString }.getOrDefault(""))
}

private fun answered(answer:JsonElement?)=answerValues(answer).any { it.isNotBlank() } ||
    (answer?.isJsonPrimitive==true&&answer.asJsonPrimitive.isBoolean)

fun onboardingConditionMatches(condition:OnboardingConditionDto,answers:Map<String,JsonElement>):Boolean {
    val answer=answers[condition.sourceQuestionKey]
    val values=answerValues(answer)
    return when(condition.operator) {
        "EQUALS" -> values.any { it==condition.expectedValues.firstOrNull() }
        "NOT_EQUALS" -> values.all { it!=condition.expectedValues.firstOrNull() }
        "IN" -> values.any { it in condition.expectedValues }
        "NOT_IN" -> values.all { it !in condition.expectedValues }
        "IS_TRUE" -> answer?.isJsonPrimitive==true&&runCatching { answer.asBoolean }.getOrDefault(false)
        "IS_FALSE" -> answer?.isJsonPrimitive==true&&!runCatching { answer.asBoolean }.getOrDefault(true)
        "ANSWERED" -> answered(answer)
        "NOT_ANSWERED" -> !answered(answer)
        else -> false
    }
}

fun visibleOnboardingQuestions(step:OnboardingStepDto,answers:Map<String,JsonElement>)=
    step.questions.filter { question->question.conditions.all { onboardingConditionMatches(it,answers) } }

fun visibleOnboardingSteps(definition:OnboardingDefinitionDto,answers:Map<String,JsonElement>)=
    definition.steps.filter { visibleOnboardingQuestions(it,answers).isNotEmpty() }

data class OnboardingProgressDisplay(val current:Int,val total:Int,val percent:Int)

fun dynamicOnboardingProgress(definition:OnboardingDefinitionDto,answers:Map<String,JsonElement>,currentStepKey:String?):OnboardingProgressDisplay {
    val steps=visibleOnboardingSteps(definition,answers)
    val index=steps.indexOfFirst { it.key==currentStepKey }.coerceAtLeast(0)
    return OnboardingProgressDisplay(
        current=if(steps.isEmpty())0 else index+1,
        total=steps.size,
        percent=if(steps.isEmpty())100 else (((index+1).toDouble()/steps.size)*100).roundToInt(),
    )
}

fun missingRequiredOnboardingQuestions(step:OnboardingStepDto,answers:Map<String,JsonElement>)=
    visibleOnboardingQuestions(step,answers).filter { it.required&&!answered(answers[it.key]) }.map { it.key }

fun onboardingStepAnswerSubset(step:OnboardingStepDto,answers:Map<String,JsonElement>)=
    answers.filterKeys { key->step.questions.any { it.key==key } }

fun onboardingUsesRtl(locale:String)=locale=="ar"

fun onboardingRetryStage(hasDefinition:Boolean)=if(hasDefinition)AuthSetupStage.DYNAMIC_ONBOARDING else AuthSetupStage.AUTHENTICATED_CHECKING
