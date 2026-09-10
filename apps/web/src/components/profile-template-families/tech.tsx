import { TemplateFrame, type TemplateFrameProps } from "./template-frame";
export default function TechFrame(props: Omit<TemplateFrameProps,"family">) { return <TemplateFrame {...props} family="tech"/>; }
