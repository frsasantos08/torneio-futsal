export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const supabase = createServiceClient()
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'Ficheiro não fornecido' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const fileName = `logo-${Date.now()}.${ext}`
  const buffer = await file.arrayBuffer()

  const { data, error } = await supabase.storage
    .from('torneio-logos')
    .upload(fileName, buffer, { contentType: file.type, upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = supabase.storage.from('torneio-logos').getPublicUrl(data.path)
  return NextResponse.json({ url: urlData.publicUrl })
}
