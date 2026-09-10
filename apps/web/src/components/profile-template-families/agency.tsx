import { TemplateFrame, type TemplateFrameProps } from "./template-frame";
export default function AgencyFrame(props: Omit<TemplateFrameProps,"family">) { return <TemplateFrame {...props} family="agency"/>; }
