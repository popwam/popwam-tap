import { TemplateFrame, type TemplateFrameProps } from "./template-frame";
export default function BrandFrame(props: Omit<TemplateFrameProps,"family">) { return <TemplateFrame {...props} family="brand"/>; }
