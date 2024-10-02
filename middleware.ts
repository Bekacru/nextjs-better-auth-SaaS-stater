import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { signToken, verifyToken } from "@/lib/auth/session";
import { authMiddleware } from "better-auth/next-js";
const protectedRoutes = "/dashboard";

export default authMiddleware({
	customRedirect: async (session, request) => {
		const pathname = request.nextUrl.pathname;
		const isProtectedRoute = pathname.startsWith(protectedRoutes);
		if (isProtectedRoute && !session) {
			return NextResponse.redirect(
				new URL(`${request.nextUrl.origin}/sign-in`),
			);
		}
		return NextResponse.next();
	},
});

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
