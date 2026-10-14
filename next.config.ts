import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/admin/vendor-onboarding-form": ["./ChopHub_Vendor_Onboarding_Form.pdf"],
  },
};

export default nextConfig;
