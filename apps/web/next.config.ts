import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Router cache phía client: trang dynamic đã xem được giữ 30s —
    // bấm qua lại menu gần như tức thì. Server Action + revalidatePath
    // vẫn xóa cache ngay khi dữ liệu đổi nên không lo hiển thị cũ.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
