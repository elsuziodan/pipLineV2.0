import { NextResponse } from 'next/server';
import { generateStaticHTML } from '@/lib/htmlGenerator';
import { deployToVercel } from '@/lib/vercelDeploy';
import { validateAiResponse } from '@/lib/validate';

export async function POST(req: Request) {
  try {
    const { document, slug } = await req.json();

    // Validar inputs
    if (!document || !slug) {
      return NextResponse.json(
        { error: 'Se requiere un documento y un slug.' },
        { status: 400 }
      );
    }

    // Sanitizar slug
    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!cleanSlug) {
      return NextResponse.json(
        { error: 'Slug inválido. Usa solo letras, números y guiones.' },
        { status: 400 }
      );
    }

    // Validar documento
    const validated = validateAiResponse(document);

    // Generar HTML
    const fullDocument = {
      businessName: validated.businessName,
      primaryColor: document.primaryColor || '#6366f1',
      blocks: validated.blocks,
    };

    const html = generateStaticHTML(fullDocument);

    // Deployar
    const result = await deployToVercel(html, cleanSlug);

    return NextResponse.json({
      success: true,
      url: result.url,
      deployId: result.id,
      slug: cleanSlug,
    });
  } catch (error: any) {
    console.error('Publish Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al publicar' },
      { status: 500 }
    );
  }
}
