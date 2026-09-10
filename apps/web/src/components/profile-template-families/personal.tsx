import { TemplateFrame, type TemplateFrameProps } from "./template-frame";
export default function PersonalFrame(props: Omit<TemplateFrameProps,"family">) { return <TemplateFrame {...props} family="personal"/>; }
