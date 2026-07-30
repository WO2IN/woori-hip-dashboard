import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'


export async function POST(req: NextRequest) {
  try {

    const formData = await req.formData()

    const file = formData.get('file') as File | null


    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다.' },
        { status: 400 }
      )
    }


    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '이미지 파일만 업로드 가능합니다.' },
        { status: 400 }
      )
    }


    const MAX_SIZE = 10 * 1024 * 1024

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: '이미지는 10MB 이하만 가능합니다.' },
        { status: 400 }
      )
    }


    const ext =
      file.name.split('.').pop() || 'jpg'


    const filename =
      `${uuidv4()}.${ext}`


    const uploadDir = join(
      process.cwd(),
      'public',
      'storage',
      'plating'
    )


    await mkdir(uploadDir, {
      recursive: true,
    })


    const buffer = Buffer.from(
      await file.arrayBuffer()
    )


    await writeFile(
      join(uploadDir, filename),
      buffer
    )


    return NextResponse.json({
      success: true,
      url: `/storage/plating/${filename}`,
    })


  } catch(error) {

    console.error(
      '도금 사진 업로드 실패:',
      error
    )


    return NextResponse.json(
      { error: '업로드 실패' },
      { status:500 }
    )
  }
}