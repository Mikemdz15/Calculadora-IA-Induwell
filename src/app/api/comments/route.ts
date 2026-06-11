import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyDirector(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No autorizado: Falta token de autenticación', status: 401 };
  }
  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return { error: 'Token inválido', status: 401 };
  }

  // Get user profile role
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'Perfil no encontrado', status: 404 };
  }

  if (profile.role !== 'director') {
    return { error: 'No autorizado: Solo el director puede modificar comentarios', status: 403 };
  }

  return { user, profile };
}

export async function DELETE(request: Request) {
  try {
    const authResult = await verifyDirector(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json({ error: 'Falta el ID del comentario' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('comments_history')
      .delete()
      .eq('id', commentId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = await verifyDirector(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { commentId, commentText } = await request.json();

    if (!commentId || !commentText) {
      return NextResponse.json({ error: 'Falta el ID del comentario o el texto' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('comments_history')
      .update({ comment: commentText })
      .eq('id', commentId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
