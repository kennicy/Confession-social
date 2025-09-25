// middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  const url = request.nextUrl;
  const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  // Nếu đang bảo trì và không phải trang maintenance
  if (
    isMaintenance &&
    !url.pathname.startsWith("/maintenance") &&
    !url.pathname.startsWith("/_next") && // bỏ qua static files
    !url.pathname.startsWith("/favicon.ico") // bỏ qua favicon
  ) {
    url.pathname = "/maintenance"; // chuyển hướng đến trang bảo trì
    return NextResponse.redirect(url);
  }

  // Nếu không còn bảo trì và đang ở /maintenance → quay về /
  if (!isMaintenance && url.pathname.startsWith("/maintenance")) {
    url.pathname = "/"; // hoặc "/login" nếu muốn
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
