import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const deviceId = request.nextUrl.searchParams.get('deviceId');
    
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('wishlist_items')
      .select('product_id')
      .eq('device_id', deviceId);

    if (error) throw error;

    return NextResponse.json({
      device_id: deviceId,
      product_ids: data?.map((w: any) => w.product_id) || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    console.error('Wishlist GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wishlist' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_id, product_id, action } = body;

    if (!device_id || !product_id) {
      return NextResponse.json(
        { error: 'Device ID and Product ID required' },
        { status: 400 }
      );
    }

    if (action === 'add') {
      const { error } = await supabase
        .from('wishlist_items')
        .upsert(
          {
            device_id,
            product_id,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'device_id,product_id' }
        );

      if (error) throw error;
      return NextResponse.json({ success: true, action: 'added' });
    } else if (action === 'remove') {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('device_id', device_id)
        .eq('product_id', product_id);

      if (error) throw error;
      return NextResponse.json({ success: true, action: 'removed' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Wishlist POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update wishlist' },
      { status: 500 }
    );
  }
}
