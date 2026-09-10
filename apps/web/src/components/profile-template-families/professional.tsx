import { TemplateFrame, type TemplateFrameProps } from "./template-frame";
export default function ProfessionalFrame(props: Omit<TemplateFrameProps,"family">) { return <TemplateFrame {...props} family="professional"/>; }
