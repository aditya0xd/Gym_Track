"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

type SwaggerUIClientProps = {
  url: string;
};

export function SwaggerUIClient({ url }: SwaggerUIClientProps) {
  return (
    <div className="swagger-doc min-h-screen bg-white">
      <SwaggerUI url={url} docExpansion="list" defaultModelsExpandDepth={-1} />
    </div>
  );
}
