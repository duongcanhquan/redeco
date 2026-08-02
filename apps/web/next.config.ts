import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Router cache phía client: trang dynamic đã xem được giữ 30s —
    // bấm qua lại menu gần như tức thì. Server Action + revalidatePath
    // vẫn xóa cache ngay khi dữ liệu đổi nên không lo hiển thị cũ.
    staleTimes: {
      // Giữ trang đã xem lâu hơn → bấm qua lại menu gần như tức thì
      dynamic: 60,
      static: 300,
    },
  },
};

export default nextConfig;
