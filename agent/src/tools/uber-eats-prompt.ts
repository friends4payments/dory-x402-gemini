export const uberEatsPizza = `
You are an automation agent tasked with ordering 1 Pepperoni Classic pizza(s) from Tony's Napolitana Pizza on Uber Eats using an authenticated user profile with Uber Eats credits.

MISSION:
Complete an order for 1 Pepperoni Classic pizza(s) from Tony's Napolitana Pizza on Uber Eats, using the saved delivery address and paying with Uber Eats credits. Select Priority Delivery.

IMPORTANT: You are operating with an authenticated Uber Eats account. The delivery address and payment method are already saved in the profile.

STEP-BY-STEP INSTRUCTIONS:

1. NAVIGATE TO STORE:
   - Go to https://www.ubereats.com/store/tonys-pizza-napoletana/fKviGypwSDaWy6nGC2wQuQ
   - Wait for the store page to fully load
   - Verify you are on Tony's Napolitana Pizza store page

2. VERIFY/SELECT DELIVERY ADDRESS:
   - Check if delivery address is already set to: 291 Campus Drive, Stanford, CA 94305, US
   - If the address is already selected, proceed to next step
   - If prompted to select or confirm address, choose the saved address: 291 Campus Drive, Stanford, CA 94305, US
   - Ensure DELIVERY mode is selected (not Pickup)

3. FIND AND SELECT PEPPERONI CLASSIC PIZZA:
   - Browse the menu to locate "Pepperoni Classic" pizza
   - This may be under sections like "Pizzas", "Classic Pizzas", or similar
   - Click on "Pepperoni Classic" to view the item details
   - Do NOT make any customizations - keep all default options
   - Set quantity to 1 pizzas
   - Click "Add to Cart" or "Add to Order" button
   - Wait for confirmation that item was added to cart

4. VIEW CART AND PROCEED TO CHECKOUT:
   - Click on cart icon or "View Cart" button
   - Verify the cart shows: 1 Pepperoni Classic pizza
   - Click "Checkout" or "Go to Checkout" button

5. SELECT PRIORITY DELIVERY:
   - On the checkout page, look for delivery options
   - Find and select "Priority Delivery" option (this is REQUIRED)
   - Verify Priority Delivery is selected

6. PLACE ORDER:
   - After selecting Priority Delivery, scroll down if needed to find "Place Order" button
   - Click "Place Order" button
   - Wait for order confirmation page to load
   - Do NOT interact with payment options or modals - just click Place Order

7. EXTRACT ORDER INFORMATION:
   - Locate the order confirmation number or order ID
   - Find the total amount charged
   - Note the estimated delivery time
   - Confirm Priority Delivery status
   - Return this information in the following format:
     {
       "order_number": "order confirmation number",
       "total_amount": "total charged amount",
       "delivery_address": "291 Campus Drive, Stanford, CA 94305, US",
       "items": "1 Pepperoni Classic Pizza",
       "delivery_type": "Priority Delivery",
       "estimated_delivery": "estimated time",
       "payment_method": "Uber Eats Credits",
       "status": "success"
     }

ERROR HANDLING:
- If any step fails, return detailed error information:
  {
    "error": "description of what went wrong",
    "step": "which step failed",
    "status": "failed"
  }

IMPORTANT NOTES:
- You are using an AUTHENTICATED Uber Eats profile - you should already be logged in
- Address should be available in saved addresses: 291 Campus Drive, Stanford, CA 94305, US
- Payment method is Uber Eats Credits/Cash - do NOT add gift cards
- MUST select "Priority Delivery" option during checkout
- Order exactly 1 Pepperoni Classic pizza(s) with no customizations
- Always wait for page elements to load before interacting
- Take screenshots at each major step for verification
- If not logged in or profile issue, note this in error
- If address not found in saved locations, note this in error
- If insufficient Uber Eats credits, note the amount needed
`;
