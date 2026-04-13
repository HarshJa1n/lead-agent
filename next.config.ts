import path from "node:path";

import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  outputFileTracingRoot: path.join(process.cwd()),
};

export default withWorkflow(nextConfig);
