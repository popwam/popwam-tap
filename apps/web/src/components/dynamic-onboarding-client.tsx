"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trackFirebaseAnalyticsEvent } from "@/lib/firebase/analytics";
import {
  APPROVED_ONBOARDING_QUESTION_TYPES,
  type OnboardingAnswer,
  type OnboardingAnswers,
  type OnboardingDefinitionContract,
  type OnboardingQuestionContract,
  onboardingProgress,
  visibleQuestions,
  visibleSteps,
} from "@/lib/dynamic-onboarding-policy";

export type DynamicOnboardingState = {
  state: "ONBOARDING_REQUIRED" | "ONBOARDING_IN_PROGRESS";
  revision: number;
  profileId?: string | null;
  currentStepKey?: string | null;
  answers?: OnboardingAnswers;
  definition: OnboardingDefinitionContract;
};

const componentRegistry = Object.fromEntries(
  APPROVED_ONBOARDING_QUESTION_TYPES.map((type) => [type, true]),
) as Record<string, boolean>;

function strings(locale: "ar" | "en") {
  return locale === "ar" ? {
    eyebrow: "أكمل ملفك", back: "السابق", continue: "متابعة", finish: "إنهاء",
    save: "حفظ والمتابعة لاحقاً", saving: "جارٍ الحفظ…", optional: "اختياري",
    yes: "نعم", no: "لا", media: "يمكن إضافة الصور بأمان من محرر الملف بعد الإعداد.",
    unknown: "نوع سؤال غير مدعوم. لم يتم حفظ أي بيانات.",
    required: "هذه الإجابة مطلوبة.", invalid: "راجع هذه الإجابة وحاول مرة أخرى.",
    error: "تعذر حفظ هذه الخطوة. راجع الحقول وحاول مرة أخرى.",
    stale: "تم تحديث التقدم على جهاز آخر. أعد تحميل أحدث نسخة.",
    saved: "تم الحفظ. يمكنك المتابعة من أي جهاز.",
  } : {
    eyebrow: "Complete your profile", back: "Back", continue: "Continue", finish: "Finish",
    save: "Save and resume later", saving: "Saving…", optional: "Optional",
    yes: "Yes", no: "No", media: "Images can be added safely from the profile editor after setup.",
    unknown: "This question type is not supported. No data was saved.",
    required: "This answer is required.", invalid: "Check this answer and try again.",
    error: "This step could not be saved. Check the fields and try again.",
    stale: "Progress changed on another device. Reload the latest version.",
    saved: "Saved. You can continue on any device.",
  };
}

function QuestionField({
  question, value, locale, error, profileId, onChange,
}: {
  question: OnboardingQuestionContract;
  value: OnboardingAnswer | undefined;
  locale: "ar" | "en";
  error?: string;
  profileId?: string | null;
  onChange: (value: OnboardingAnswer) => void;
}) {
  const copy = strings(locale);
  if (!componentRegistry[question.type]) {
    return <p role="alert" className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-200">{copy.unknown}</p>;
  }
  const label = <span className="label">{question.label}{!question.required && <small className="ms-2 text-slate-500">{copy.optional}</small>}</span>;
  const textValue = typeof value === "string" ? value : "";
  const inputType = question.type === "EMAIL" ? "email"
    : question.type === "URL" ? "url"
      : question.type === "PHONE" ? "tel"
        : question.type === "NUMBER" || question.type === "CURRENCY" ? "number"
          : question.type === "TIME" ? "time" : "text";
  const ltr = ["EMAIL", "URL", "PHONE", "NUMBER", "CURRENCY", "TIME"].includes(question.type);
  let control: React.ReactNode;
  if (question.type === "TEXTAREA" || question.type === "LOCATION" || question.type === "DAY_HOURS") {
    control = <textarea className="input min-h-28" value={textValue} maxLength={question.maxLength || undefined} onChange={(event) => onChange(event.target.value)}/>;
  } else if (["TEXT", "PHONE", "EMAIL", "URL", "NUMBER", "CURRENCY", "TIME"].includes(question.type)) {
    control = <input
      className="input"
      type={inputType}
      dir={ltr ? "ltr" : undefined}
      value={question.type === "NUMBER" || question.type === "CURRENCY" ? (typeof value === "number" ? value : "") : textValue}
      min={question.minValue || undefined}
      max={question.maxValue || undefined}
      maxLength={question.maxLength || undefined}
      onChange={(event) => onChange(
        question.type === "NUMBER" || question.type === "CURRENCY"
          ? (event.target.value === "" ? null : Number(event.target.value))
          : event.target.value,
      )}
    />;
  } else if (question.type === "BOOLEAN") {
    control = <div className="grid grid-cols-2 gap-3">
      <button type="button" className={value === true ? "btn-primary" : "btn-secondary"} onClick={() => onChange(true)}>{copy.yes}</button>
      <button type="button" className={value === false ? "btn-primary" : "btn-secondary"} onClick={() => onChange(false)}>{copy.no}</button>
    </div>;
  } else if (question.type === "SINGLE_SELECT") {
    control = <div className="grid gap-3 sm:grid-cols-2">{question.options.map((option) =>
      <button type="button" key={option.key} className={value === option.key ? "btn-primary" : "btn-secondary"} onClick={() => onChange(option.key)}>{option.label}</button>,
    )}</div>;
  } else if (question.type === "MULTI_SELECT") {
    const selected = Array.isArray(value) ? value : [];
    control = <div className="grid gap-3 sm:grid-cols-2">{question.options.map((option) => {
      const active = selected.includes(option.key);
      return <button type="button" key={option.key} className={active ? "btn-primary" : "btn-secondary"} onClick={() => onChange(active ? selected.filter((key) => key !== option.key) : [...selected, option.key])}>{option.label}</button>;
    })}</div>;
  } else if (question.type === "IMAGE") {
    control = profileId ? <ImageQuestion profileId={profileId} value={value} copy={copy} onChange={onChange}/> : <p className="rounded-2xl border border-white/10 p-4 text-sm text-slate-400">{copy.media}</p>;
  } else {
    control = <p role="alert" className="text-amber-300">{copy.unknown}</p>;
  }
  return <label className="grid gap-2">{label}{question.help && <span className="text-sm text-slate-400">{question.help}</span>}{control}{error && <span role="alert" className="text-sm text-amber-300">{error === "REQUIRED" ? copy.required : copy.invalid}</span>}</label>;
}

function ImageQuestion({profileId,value,copy,onChange}:{profileId:string;value:OnboardingAnswer|undefined;copy:ReturnType<typeof strings>;onChange:(value:OnboardingAnswer)=>void}){
  const [pending,setPending]=useState(false);const [error,setError]=useState("");
  const selected=Array.isArray(value)&&value.length>0;
  return <div className="rounded-2xl border border-white/10 p-4"><input type="file" accept="image/jpeg,image/png,image/webp" disabled={pending} onChange={async event=>{const file=event.target.files?.[0];if(!file)return;setPending(true);setError("");try{const data=new FormData();data.set("purpose","ONBOARDING_IMAGE");data.set("file",file);const response=await fetch(`/api/profiles/${profileId}/media`,{method:"POST",body:data});const json=await response.json();if(!response.ok)throw new Error(json.error);onChange([json.asset.id]);}catch(reason){setError(reason instanceof Error?reason.message:copy.error)}finally{setPending(false)}}}/>{pending&&<p className="mt-2 text-sm text-slate-400">{copy.saving}</p>}{selected&&<p className="mt-2 text-sm text-emerald-300">{copy.saved}</p>}{error&&<p className="mt-2 text-sm text-amber-300">{error}</p>}</div>
}

export function DynamicOnboardingClient({ locale, initial }: { locale: "ar" | "en"; initial: DynamicOnboardingState }) {
  const router = useRouter();
  const copy = strings(locale);
  const [state, setState] = useState(initial);
  const [answers, setAnswers] = useState<OnboardingAnswers>(initial.answers || {});
  const [pending, setPending] = useState(initial.state === "ONBOARDING_REQUIRED");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const steps = useMemo(() => visibleSteps(state.definition, answers), [state.definition, answers]);
  const current = steps.find((step) => step.key === state.currentStepKey) || steps[0];
  const progress = onboardingProgress(state.definition, answers, current?.key || null);
  const index = Math.max(0, steps.findIndex((step) => step.key === current?.key));

  useEffect(() => {
    if (initial.state !== "ONBOARDING_REQUIRED") return;
    fetch("/api/onboarding/start", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ locale }),
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setState(result); setAnswers(result.answers || {});
      void trackFirebaseAnalyticsEvent("onboarding_started", {
        platform: "web", profile_kind: result.definition.profileKind,
        category_key: result.definition.categoryKey || "fallback",
        definition_version: result.definition.version,
      });
    }).catch(() => setError(copy.error)).finally(() => setPending(false));
  }, [copy.error, initial.state, locale]);

  useEffect(() => {
    if (!current) return;
    void trackFirebaseAnalyticsEvent("onboarding_step_viewed", {
      platform: "web", profile_kind: state.definition.profileKind,
      category_key: state.definition.categoryKey || "fallback",
      step_key: current.key, definition_version: state.definition.version,
    });
  }, [current?.key, state.definition.categoryKey, state.definition.profileKind, state.definition.version]);

  async function save(direction: "BACK" | "CONTINUE" | "STAY") {
    if (!current || pending) return;
    setPending(true); setError(""); setSaved(false); setFieldErrors({});
    const stepAnswers = Object.fromEntries(
      current.questions.filter((question) => question.key in answers).map((question) => [question.key, answers[question.key]]),
    );
    try {
      const response = await fetch("/api/onboarding/progress", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, revision: state.revision, stepKey: current.key, direction, answers: stepAnswers }),
      });
      const result = await response.json();
      if (!response.ok) {
        setFieldErrors(result.fields || {});
        setError(result.error === "ONBOARDING_PROGRESS_STALE" ? copy.stale : copy.error);
        return;
      }
      setState(result); setAnswers(result.answers || answers);
      if (direction === "STAY") {
        setSaved(true);
        void trackFirebaseAnalyticsEvent("onboarding_resumed", { platform: "web", outcome: "saved", definition_version: state.definition.version });
        return;
      }
      void trackFirebaseAnalyticsEvent("onboarding_step_completed", {
        platform: "web", step_key: current.key, definition_version: state.definition.version,
      });
      if (direction === "CONTINUE" && index === steps.length - 1) {
        const complete = await fetch("/api/onboarding/complete", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale, revision: result.revision }),
        });
        const completion = await complete.json();
        if (!complete.ok) {
          setFieldErrors(completion.fields || {});
          setError(completion.error === "ONBOARDING_PROGRESS_STALE" ? copy.stale : copy.error);
          return;
        }
        void trackFirebaseAnalyticsEvent("onboarding_completed", {
          platform: "web", profile_kind: state.definition.profileKind,
          category_key: state.definition.categoryKey || "fallback",
          definition_version: state.definition.version, outcome: "success",
        });
        router.push("/dashboard"); router.refresh();
      }
    } catch {
      setError(copy.error);
    } finally {
      setPending(false);
    }
  }

  if (pending && !current) return <main className="flex min-h-screen items-center justify-center"><div className="size-9 animate-spin rounded-full border-4 border-brand-400 border-t-transparent"/></main>;
  if (!current) return <main className="flex min-h-screen items-center justify-center px-5"><p role="alert" className="card max-w-lg p-6 text-amber-300">{copy.unknown}</p></main>;
  return <main className="mx-auto min-h-screen max-w-2xl px-5 py-8 sm:py-12" dir={locale === "ar" ? "rtl" : "ltr"}>
    <header>
      <p className="text-sm font-bold text-brand-400">{copy.eyebrow} · {progress.current}/{progress.total}</p>
      <h1 className="mt-2 text-3xl font-black">{current.title}</h1>
      {current.description && <p className="mt-2 leading-7 text-slate-400">{current.description}</p>}
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}>
        <div className="h-full bg-brand-400 transition-[width]" style={{ width: `${progress.percent}%` }}/>
      </div>
    </header>
    <section className="card mt-6 grid gap-6 p-5 sm:p-7">
      {visibleQuestions(current, answers).map((question) =>
        <QuestionField key={question.key} question={question} value={answers[question.key]} locale={locale} error={fieldErrors[question.key]} profileId={state.profileId} onChange={(value) => setAnswers((currentAnswers) => ({ ...currentAnswers, [question.key]: value }))}/>,
      )}
      {error && <p role="alert" className="rounded-xl bg-amber-400/10 p-3 text-sm text-amber-300">{error}</p>}
      {saved && <p role="status" className="text-sm text-emerald-300">{copy.saved}</p>}
      {pending && <div className="h-1 animate-pulse rounded-full bg-brand-400"/>}
      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" className="btn-secondary" disabled={pending || index === 0} onClick={() => void save("BACK")}>{copy.back}</button>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" disabled={pending} onClick={() => void save("STAY")}>{pending ? copy.saving : copy.save}</button>
          <button type="button" className="btn-primary" disabled={pending} onClick={() => void save("CONTINUE")}>{index === steps.length - 1 ? copy.finish : copy.continue}</button>
        </div>
      </div>
    </section>
  </main>;
}
