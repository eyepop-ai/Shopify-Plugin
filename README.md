# EyePop.ai Shopify Plugin 



## Current Status & Next Steps

We have successfully set up:
1.  A Shopify Partner account and a development store.
2.  Initialized a new Shopify app using the Shopify CLI (`npm init @shopify/app@latest`).
3.  Built the foundational UI and backend logic for Phase 1.

The current build allows users to upload images, define a main subject and custom questions for analysis, send these to a mock EyePop processing endpoint, and view the status and results.

**Important Note on EyePop API Integration:**
The `ResponseViewer` component currently uses **dummy data** to display analysis results. Waiting for the final API structure for EyePop's "Report Pop" to fully configure the response handling. The current `eyepop-client.ts` and API endpoint (`api.eyepop-process.ts`) are set up to process images but will need adaptation for the specific request/response format of the targeted EyePop API for custom question-based analysis.

## Project Structure: Key EyePop Integration Files

All EyePop-specific integration code is located within the `app/` directory:

```
eyepop-connector/
└── app/
    ├── lib/
    │   └── eyepop-client.ts     # EyePop SDK client wrapper
    ├── components/
    │   ├── ImageUploader.tsx    # Handles image uploads (drag & drop, click)
    │   ├── QuestionBuilder.tsx  # Allows users to define analysis questions
    │   ├── ProcessingStatus.tsx # Displays processing status of images
    │   └── ResponseViewer.tsx   # Shows analysis results (currently dummy data)
    └── routes/
        ├── api.eyepop-process.ts  # API endpoint to handle image processing requests
        └── app.eyepop-test.tsx    # Main page for the EyePop test interface
```

## Getting Started

1.  **Clone/Pull the Repository:**
    ```bash
    git clone <repository-url>
    cd eyepop-connector
    ```

2.  **Install Dependencies:**
    This project uses Node.js and npm. Dependencies are listed in `package.json`.
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root of the `eyepop-connector` directory with your EyePop API credentials:
    ```env
    EYEPOP_POP_ID="your_pop_id_here"
    EYEPOP_SECRET_KEY="your_secret_key_here"
    SHOPIFY_APP_URL="your_app_url_from_partners_dashboard_or_ngrok"
    SHOPIFY_API_KEY="your_app_api_key_from_partners_dashboard"
    SHOPIFY_API_SECRET="your_app_api_secret_from_partners_dashboard"
    SCOPES="write_products,read_products" # Or other scopes your app needs
    ```
    *   `EYEPOP_*` variables are needed for the EyePop integration.
    *   `SHOPIFY_*` variables are standard for Shopify app development and will be configured when you run `npm run dev` if it's a fresh setup, or you can get them from your Shopify Partners dashboard for an existing app.

4.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    This command will start the Shopify app development server, often using a tool like ngrok to provide an HTTPS tunnel to your local machine.

5.  **Access the EyePop Test Page:**
    *   The `npm run dev` command will output a URL (e.g., `https://your-ngrok-subdomain.ngrok.io`).
    *   Open this URL in your browser. You will typically be prompted to install the app on your development store.
    *   Once the app is running and installed, navigate to the EyePop integration page by appending `/app/eyepop-test` to the app's URL in your development store.
        For example: `https://your-ngrok-subdomain.ngrok.io/app/eyepop-test` (Note: The exact base URL might vary depending on your Shopify app setup and ngrok).

## Next Steps

*   Integrate with the official EyePop "Report Pop" API once the structure is finalized.
*   Map EyePop analysis results to Shopify product fields.
*   Implement logic to create/update Shopify product listings.
