import { TemplateFrame, type TemplateFrameProps } from "./template-frame";
export default function StorefrontFrame(props: Omit<TemplateFrameProps,"family">) { return <TemplateFrame {...props} family="storefront"/>; }
