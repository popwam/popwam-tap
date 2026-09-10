import { TemplateFrame, type TemplateFrameProps } from "./template-frame";
export default function BusinessFrame(props: Omit<TemplateFrameProps,"family">) { return <TemplateFrame {...props} family="business"/>; }
