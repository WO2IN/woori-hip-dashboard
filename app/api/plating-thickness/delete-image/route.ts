import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'


export async function POST(req: Request) {

  try {

    const { url } = await req.json()


    if (!url) {
      return NextResponse.json(
        { error: '파일 경로 없음' },
        { status: 400 }
      )
    }


    // /storage/xxx.png -> 실제 경로 변환
    const filePath = path.join(
      process.cwd(),
      'public',
      url
    )


    await fs.unlink(filePath)


    return NextResponse.json({
      success: true
    })


  } catch(error) {

    console.error('이미지 삭제 실패:', error)

    return NextResponse.json(
      {
        error: '삭제 실패'
      },
      {
        status: 500
      }
    )

  }

}