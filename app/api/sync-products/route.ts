import { stripe } from '@/utils/stripe/config';
import { upsertProductRecord, upsertPriceRecord } from '@/utils/supabase/admin';

export async function GET() {
  try {
    // Fetch all products from Stripe
    const products = await stripe.products.list();
    
    // Sync each product
    for (const product of products.data) {
      await upsertProductRecord(product);
      
      // Fetch and sync prices for this product
      const prices = await stripe.prices.list({
        product: product.id
      });
      
      for (const price of prices.data) {
        await upsertPriceRecord(price);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: `Synced ${products.data.length} products and their prices`
    }));
  } catch (error: any) {
    console.error('Error syncing products:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500 });
  }
} 