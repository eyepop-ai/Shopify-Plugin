// API endpoint for exporting EyePop analysis results to Shopify
// This endpoint creates Shopify products from the AI-generated content

import { ActionFunctionArgs, json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// Helper function to convert data URL to blob
function dataURLtoBlob(dataURL: string): { blob: Blob; mimeType: string; filename: string } {
  const arr = dataURL.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  // Generate filename based on mime type
  const extension = mimeType.split('/')[1] || 'jpg';
  const filename = `product-image-${Date.now()}.${extension}`;
  
  return { 
    blob: new Blob([u8arr], { type: mimeType }), 
    mimeType, 
    filename 
  };
}

// Helper function to upload image using Shopify's staged upload process
async function uploadImageToShopify(admin: any, imageSrc: string, altText: string): Promise<string | null> {
  try {
    console.log("🔄 [Image Upload] Starting staged upload process...");
    
    // Convert data URL to blob
    const { blob, mimeType, filename } = dataURLtoBlob(imageSrc);
    console.log(`📁 [Image Upload] Prepared file: ${filename} (${mimeType}, ${blob.size} bytes)`);

    // Step 1: Create staged upload target
    const stagedUploadMutation = `
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const stagedUploadResponse = await admin.graphql(stagedUploadMutation, {
      variables: {
        input: [{
          resource: "IMAGE",
          filename: filename,
          mimeType: mimeType,
          httpMethod: "POST",
          fileSize: blob.size.toString()
        }]
      }
    });

    const stagedUploadJson = await stagedUploadResponse.json();
    console.log("📥 [Image Upload] Staged upload response:", stagedUploadJson);

    if (stagedUploadJson.data?.stagedUploadsCreate?.userErrors?.length > 0) {
      console.error("❌ [Image Upload] Staged upload creation failed:", stagedUploadJson.data.stagedUploadsCreate.userErrors);
      return null;
    }

    const stagedTarget = stagedUploadJson.data?.stagedUploadsCreate?.stagedTargets?.[0];
    if (!stagedTarget) {
      console.error("❌ [Image Upload] No staged target returned");
      return null;
    }

    console.log("✅ [Image Upload] Staged upload target created:", {
      url: stagedTarget.url,
      resourceUrl: stagedTarget.resourceUrl,
      parametersCount: stagedTarget.parameters?.length || 0
    });

    // Step 2: Upload the file to the staged URL
    const formData = new FormData();
    
    // Add all the parameters from Shopify
    if (stagedTarget.parameters) {
      for (const param of stagedTarget.parameters) {
        formData.append(param.name, param.value);
      }
    }
    
    // Add the file last (this is important for some upload services)
    formData.append('file', blob, filename);

    console.log("🚀 [Image Upload] Uploading file to staged URL...");
    const uploadResponse = await fetch(stagedTarget.url, {
      method: 'POST',
      body: formData
    });

    console.log(`📥 [Image Upload] Upload response status: ${uploadResponse.status}`);
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("❌ [Image Upload] File upload failed:", {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorText
      });
      return null;
    }

    console.log("✅ [Image Upload] File uploaded successfully to staged URL");
    return stagedTarget.resourceUrl;

  } catch (error) {
    console.error("❌ [Image Upload] Error in staged upload process:", error);
    return null;
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const startTime = Date.now();
  console.log("🛍️ [Shopify Export] Starting export request at", new Date().toISOString());
  
  try {
    // Authenticate with Shopify
    console.log("🔐 [Shopify Export] Authenticating with Shopify...");
    const { admin } = await authenticate.admin(request);
    console.log("✅ [Shopify Export] Shopify authentication successful");

    // Parse the request body
    console.log("📋 [Shopify Export] Parsing request body...");
    const body = await request.json();
    const { analysisResults } = body;

    if (!analysisResults || !Array.isArray(analysisResults)) {
      console.error("❌ [Shopify Export] Invalid request body - missing analysisResults array");
      return json({
        success: false,
        message: "Invalid request body - missing analysisResults array",
        results: [],
        summary: { total: 0, successful: 0, failed: 1, processingTimeMs: Date.now() - startTime }
      }, { status: 400 });
    }

    console.log(`📊 [Shopify Export] Processing ${analysisResults.length} analysis results`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Process each analysis result
    for (let i = 0; i < analysisResults.length; i++) {
      const result = analysisResults[i];
      // Use product_title from extractedData for fileName if available, then result.id
      const fileName = result.rawJson?.extractedData?.product_title || result.id || `Product ${i + 1}`;
      
      console.log(`🔄 [Shopify Export] Processing result ${i + 1}/${analysisResults.length}: ${fileName}`);
      console.log(`🔍 [Shopify Export] Full analysis result for ${fileName}:`, JSON.stringify(result, null, 2)); // Log the whole result stringified for better inspection

      try {
        // Correctly access nested extractedData and imageSrc
        const extractedData = result.rawJson?.extractedData || {};
        const imageSrc = result.rawJson?.imageSrc || result.imageSrc; // Check rawJson first, then top-level
        const productType = result.rawJson?.productType || result.productType || 'General';
        const defaultVendor = result.rawJson?.defaultVendor || result.defaultVendor || "EyePop AI Generated";

        // Debug logging to understand the data structure
        console.log(`🔍 [Shopify Export] Debugging data structure for "${fileName}":`, {
          hasRawJson: !!result.rawJson,
          rawJsonKeys: result.rawJson ? Object.keys(result.rawJson) : [],
          rawJsonImageSrc: result.rawJson?.imageSrc ? 'FOUND' : 'NOT FOUND',
          rawJsonImageSrcType: result.rawJson?.imageSrc ? (result.rawJson.imageSrc.startsWith('data:') ? 'data URL' : 'regular URL') : 'none',
          topLevelKeys: Object.keys(result),
          topLevelImageSrc: result.imageSrc ? 'FOUND' : 'NOT FOUND',
          hasImageSrcInRawJson: !!(result.rawJson?.imageSrc),
          hasImageSrcTopLevel: !!result.imageSrc,
          imageSrcFound: !!imageSrc,
          imageSrcSource: result.rawJson?.imageSrc ? 'rawJson' : result.imageSrc ? 'topLevel' : 'none',
          extractedDataKeys: Object.keys(extractedData),
          // Show first few characters of imageSrc if it exists
          imageSrcPreview: imageSrc ? imageSrc.substring(0, 50) + '...' : 'none'
        });

        // Map the analysis results to Shopify product fields
        const productTitle = extractedData.product_title || `AI Generated: ${fileName}`;
        const productDescription = extractedData.product_description || 'AI-generated product description.';
        
        let productTags = extractedData.product_tags || [productType, 'AI-generated'];
        if (typeof productTags === 'string') { // Ensure tags are an array
            productTags = productTags.split(/[;,]/).map((tag: string) => tag.trim()).filter(Boolean);
        }
        if (!Array.isArray(productTags) || productTags.length === 0) {
            productTags = [productType, 'AI-generated'];
        }
        
        const seoDescription = extractedData.seo_description || productDescription.substring(0, 320); // Shopify SEO description limit is 320
        const altText = extractedData.alt_text || productTitle;
        
        // Price is expected to be a number from EyePopClient, convert to string for Shopify
        const priceFromExtractedData = extractedData.price;

        console.log(`📝 [Shopify Export] Extracted content for "${fileName}":`, {
          productTitle: productTitle.substring(0, 50) + "...",
          productDescriptionLength: productDescription.length,
          productTagsCount: productTags.length,
          productTags: productTags,
          seoDescriptionLength: seoDescription.length,
          altTextLength: altText.length,
          priceFromExtractedData: priceFromExtractedData,
          imageSrcExists: !!imageSrc,
          imageSrcType: imageSrc ? (imageSrc.startsWith('data:') ? 'data URL' : 'regular URL') : 'none',
          imageSrcSize: imageSrc ? `${(imageSrc.length / 1024).toFixed(1)}KB` : 'N/A',
          productType,
          defaultVendor
        });

        console.log(`🚀 [Shopify Export] Creating product: "${productTitle}"`);

        const productInput: any = {
            title: productTitle,
            descriptionHtml: `<p>${String(productDescription).replace(/\n/g, '</p><p>')}</p>`, // Ensure HTML format
            productType: productType,
            vendor: defaultVendor, 
            tags: productTags,
            status: "DRAFT", 
            seo: {
              title: productTitle.substring(0, 70), 
              description: seoDescription.substring(0, 320)
            },
            // variants will be handled separately after product creation
        };

        // Store price for variant creation after product is created
        let variantPrice = "0.00";
        if (priceFromExtractedData !== undefined && priceFromExtractedData !== null && !isNaN(parseFloat(String(priceFromExtractedData)))) {
            variantPrice = String(parseFloat(String(priceFromExtractedData)));
            console.log(`💰 [Shopify Export] Will set price for "${fileName}": ${variantPrice}`);
        } else {
            console.warn(`⚠️ [Shopify Export] Price not found or invalid for "${fileName}" (value: ${priceFromExtractedData}), defaulting to 0.00`);
        }

        // Upload image first if available (before creating product)
        let uploadedImageUrl: string | null = null;
        if (imageSrc && imageSrc.startsWith('data:')) {
          console.log(`🖼️ [Shopify Export] Uploading image for product "${productTitle}"`);
          uploadedImageUrl = await uploadImageToShopify(admin, imageSrc, altText);
          
          if (uploadedImageUrl) {
            console.log(`✅ [Shopify Export] Image uploaded successfully, resource URL: ${uploadedImageUrl}`);
          } else {
            console.warn(`⚠️ [Shopify Export] Image upload failed for "${productTitle}"`);
          }
        }
        
        const productMutation = `
          mutation productCreate($input: ProductInput!) {
            productCreate(input: $input) {
              product {
                id
                title
                handle
                status
                onlineStoreUrl
                variants(first: 1) {
                  edges {
                    node {
                      id
                      price
                    }
                  }
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        console.log("🚀 [Shopify Export] Sending GraphQL mutation with variables:", JSON.stringify({ input: productInput }, null, 2));

        const response = await admin.graphql(productMutation, {
          variables: { 
            input: productInput
          },
        });

        const responseJson = await response.json();
        console.log("📥 [Shopify Export] GraphQL response:", responseJson);

        if (responseJson.data?.productCreate?.userErrors?.length > 0) {
          const errors = responseJson.data.productCreate.userErrors;
          console.error("❌ [Shopify Export] Product creation failed with user errors:", errors);
          
          results.push({
            fileName,
            success: false,
            error: `Product creation failed: ${errors.map((e: any) => e.message).join(', ')}`,
            details: errors
          });
          failCount++;
          continue;
        }

        if (!responseJson.data?.productCreate?.product) {
          console.error("❌ [Shopify Export] Product creation failed - no product returned");
          
          results.push({
            fileName,
            success: false,
            error: "Product creation failed - no product returned",
            details: responseJson
          });
          failCount++;
          continue;
        }

        const createdProduct = responseJson.data.productCreate.product;
        console.log("✅ [Shopify Export] Product created successfully:", {
          id: createdProduct.id,
          title: createdProduct.title,
          handle: createdProduct.handle
        });

        // Add uploaded image to product if we have one
        if (uploadedImageUrl) {
          console.log(`🖼️ [Shopify Export] Adding uploaded image to product "${createdProduct.title}"`);
          
          try {
            const imageUploadMutation = `
              mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
                productCreateMedia(productId: $productId, media: $media) {
                  media {
                    id
                    alt
                    mediaContentType
                    status
                    ... on MediaImage {
                      image {
                        url
                        altText
                      }
                    }
                  }
                  mediaUserErrors {
                    field
                    message
                  }
                  product {
                    id
                  }
                }
              }
            `;

            const imageUploadResponse = await admin.graphql(imageUploadMutation, {
              variables: {
                productId: createdProduct.id,
                media: [{
                  originalSource: uploadedImageUrl,
                  alt: altText,
                  mediaContentType: "IMAGE"
                }]
              }
            });

            const imageUploadJson = await imageUploadResponse.json();
            console.log("📥 [Shopify Export] Image attachment response:", imageUploadJson);

            if (imageUploadJson.data?.productCreateMedia?.mediaUserErrors?.length > 0) {
              console.warn("⚠️ [Shopify Export] Image attachment had errors:", imageUploadJson.data.productCreateMedia.mediaUserErrors);
            } else if (imageUploadJson.data?.productCreateMedia?.media?.length > 0) {
              const media = imageUploadJson.data.productCreateMedia.media[0];
              console.log("✅ [Shopify Export] Image attached to product successfully:", {
                mediaId: media.id,
                mediaContentType: media.mediaContentType,
                status: media.status,
                imageUrl: media.image?.url || 'N/A'
              });
            }
          } catch (imageError) {
            console.error("❌ [Shopify Export] Error attaching image to product:", imageError);
          }
        }

        // Now update the default variant with the correct price if we have one
        if (variantPrice !== "0.00" && createdProduct.variants?.edges?.length > 0) {
          const defaultVariantId = createdProduct.variants.edges[0].node.id;
          console.log(`💰 [Shopify Export] Updating variant price for product "${createdProduct.title}" to ${variantPrice}`);
          
          const variantUpdateMutation = `
            mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                productVariants {
                  id
                  price
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `;

          const variantUpdateResponse = await admin.graphql(variantUpdateMutation, {
            variables: {
              productId: createdProduct.id,
              variants: [{
                id: defaultVariantId,
                price: variantPrice
              }]
            }
          });

          const variantUpdateJson = await variantUpdateResponse.json();
          console.log("📥 [Shopify Export] Variant update response:", variantUpdateJson);

          if (variantUpdateJson.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
            console.warn("⚠️ [Shopify Export] Variant price update had errors:", variantUpdateJson.data.productVariantsBulkUpdate.userErrors);
          } else {
            console.log("✅ [Shopify Export] Variant price updated successfully");
          }
        }

        // Extract the numeric ID for admin URL
        const numericId = createdProduct.id.split('/').pop();
        
        results.push({
          fileName,
          success: true,
          productId: createdProduct.id,
          title: createdProduct.title,
          handle: createdProduct.handle,
          status: createdProduct.status,
          adminUrl: `https://admin.shopify.com/products/${numericId}`, // Generic admin URL
          publicUrl: createdProduct.onlineStoreUrl,
          imageUploaded: !!uploadedImageUrl
        });
        successCount++;

      } catch (error) {
        console.error(`❌ [Shopify Export] Error processing result ${i + 1}:`, error);
        
        results.push({
          fileName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error instanceof Error ? error.stack : String(error)
        });
        failCount++;
      }
    }

    const processingTimeMs = Date.now() - startTime;
    const summary = {
      total: analysisResults.length,
      successful: successCount,
      failed: failCount,
      processingTimeMs
    };

    console.log("🎉 [Shopify Export] Export completed:", summary);

    return json({
      success: true,
      message: `Export completed: ${successCount} products created, ${failCount} errors`,
      results,
      summary
    });

  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    console.error("💥 [Shopify Export] Fatal error:", error);
    
    return json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      results: [],
      summary: { total: 0, successful: 0, failed: 1, processingTimeMs },
      error: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
} 