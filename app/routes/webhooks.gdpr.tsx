import type { ActionFunctionArgs } from "@remix-run/node";
import crypto from "crypto";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // Clone the request before authentication consumes the body
  const reqClone = request.clone();
  const rawPayload = await reqClone.text();
  
  // Verify HMAC signature
  const signature = request.headers.get("x-shopify-hmac-sha256");
  if (!signature) {
    console.error("Missing HMAC signature header");
    return new Response("Missing HMAC signature", { status: 401 });
  }
  
  const generatedSignature = crypto
    .createHmac("SHA256", process.env.SHOPIFY_API_SECRET!)
    .update(rawPayload)
    .digest("base64");
    
  if (signature !== generatedSignature) {
    console.error("Invalid HMAC signature");
    return new Response("Invalid HMAC signature", { status: 401 });
  }
  
  // Now authenticate the webhook
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  console.log("GDPR webhook payload:", payload);

  try {
    switch (topic) {
      case "customers/data_request":
        // Handle customer data requests
        console.log(`Processing customer data request for shop: ${shop}`);
        
        // Since the EyePop connector app primarily creates product listings from images
        // and doesn't store personal customer data, we acknowledge the request.
        
        // The app processes:
        // - Product images (uploaded by merchants, not customers)
        // - Generated product content (descriptions, titles, tags)
        // - API usage logs (no personal customer data)
        
        console.log("Customer data request acknowledged - no personal customer data stored");
        break;

      case "customers/redact":
        // Handle customer data deletion requests
        const customerId = payload.customer?.id;
        console.log(`Processing customer redaction request for customer: ${customerId}, shop: ${shop}`);
        
        try {
          // Since the EyePop connector app doesn't currently store customer-specific data,
          // this webhook mainly acknowledges the request.
          
          // The app operates at the merchant/shop level, processing:
          // - Product images uploaded by shop owners
          // - Generated product content (titles, descriptions, tags, SEO)
          // - API usage logs (anonymized)
          
          if (customerId) {
            console.log(`No customer-specific data found to redact for customer: ${customerId}`);
          }
          
          console.log("Customer redaction request completed - no personal customer data to delete");
        } catch (error) {
          console.error("Error during customer redaction:", error);
          throw new Response("Customer redaction failed", { status: 500 });
        }
        break;

      case "shop/redact":
        // Handle shop data deletion (48 hours after app uninstall)
        console.log(`Processing shop redaction request for shop: ${shop}`);
        
        try {
          // GDPR compliance: Delete all shop-related data when store owner requests data deletion
          // This is more comprehensive than app/uninstalled as it's specifically for data purging
          
          console.log(`Starting shop data redaction for ${shop}...`);
          
          // Delete all sessions for this shop
          if (db && typeof db.session?.deleteMany === 'function') {
            const deletedSessions = await db.session.deleteMany({
              where: { shop },
            });
            console.log(`Deleted ${deletedSessions.count} sessions for shop: ${shop}`);
          }
          
          // If you add additional data storage in the future, delete it here:
          // - Product generation history
          // - API usage logs
          // - User preferences
          // - Cached data
          
          console.log(`Shop data redaction completed for ${shop}`);
        } catch (error) {
          console.error("Error during shop redaction:", error);
          throw new Response("Shop redaction failed", { status: 500 });
        }
        break;

      default:
        console.log(`Unknown GDPR topic: ${topic}`);
        throw new Response(`Unknown GDPR topic: ${topic}`, { status: 400 });
    }

    // GDPR compliance: Always respond with 200 to acknowledge receipt
    return new Response("GDPR webhook processed successfully", { status: 200 });
    
  } catch (error) {
    console.error(`Error processing GDPR webhook ${topic}:`, error);
    throw new Response("GDPR webhook processing failed", { status: 500 });
  }
}; 