import type { Metadata } from "next";

import { SwaggerUIClient } from "./SwaggerUIClient";

export const metadata: Metadata = {
  title: "API Documentation | Gym Admin Portal",
  description: "Interactive OpenAPI documentation for the Gym Admin Portal REST API.",
};

export default function ApiDocPage() {
  return <SwaggerUIClient url="/api/swagger" />;
}
