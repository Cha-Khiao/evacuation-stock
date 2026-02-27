import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login", // ถ้าคนนอกแอบเข้า ให้เตะกลับไปหน้า Login
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*", 
    "/shelters/:path*",
    "/items/:path*",
    "/transactions/:path*",
    "/history/:path*",
    "/users/:path*"
  ]
};