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

    const { payload, session, topic, shop } = await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);

    const current = payload.current as string[];
    if (session) {
        await db.session.update({   
            where: {
                id: session.id
            },
            data: {
                scope: current.toString(),
            },
        });
    }
    return new Response();
};
