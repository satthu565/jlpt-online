import { NextResponse } from 'next/server';

export async function POST(): Promise<NextResponse> {
  // Return 204 No Content for Web Vitals beacon to eliminate 404 analytics errors (D04)
  return new NextResponse(null, { status: 204 });
}

export async function GET(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
