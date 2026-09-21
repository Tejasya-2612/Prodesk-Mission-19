import 'dotenv/config';
import mongoose from 'mongoose';
import { Ticket } from './models/Ticket.js';

const tickets = [
  { ticketNumber: 105, customer: 'Dallas Freight Co.', issue: 'Truck breakdown', description: 'Unit TX-482 is disabled near Denton with temperature-sensitive cargo on board.', priority: 'High', status: 'In Progress', assignedAgent: 'Agent A', resolution: '' },
  { ticketNumber: 106, customer: 'Blue Ridge Haulage', issue: 'Missed delivery window', description: 'Receiver reports the Atlanta dock appointment was missed by 45 minutes.', priority: 'High', status: 'Open', assignedAgent: 'Agent B', resolution: '' },
  { ticketNumber: 107, customer: 'Pacific Retail Group', issue: 'Damaged pallet report', description: 'Three pallets arrived with crushed corners at the Sacramento distribution center.', priority: 'Medium', status: 'Waiting on Customer', assignedAgent: 'Agent C', resolution: '' },
  { ticketNumber: 108, customer: 'Northstar Foods', issue: 'Reefer temperature alert', description: 'Trailer refrigeration telemetry exceeded the permitted threshold for 18 minutes.', priority: 'Critical', status: 'In Progress', assignedAgent: 'Dispatch Lead', resolution: '' },
  { ticketNumber: 109, customer: 'Lakeview Building Supply', issue: 'Route delay', description: 'I-80 closure has delayed the Omaha delivery route; customer needs a revised ETA.', priority: 'Medium', status: 'Open', assignedAgent: 'Agent A', resolution: '' },
  { ticketNumber: 110, customer: 'Summit Auto Parts', issue: 'Driver check-in missing', description: 'No check-in has been received from the driver since the scheduled Phoenix stop.', priority: 'High', status: 'In Progress', assignedAgent: 'Agent B', resolution: '' },
  { ticketNumber: 111, customer: 'Metro Med Supply', issue: 'Proof of delivery unavailable', description: 'Customer needs a signed POD for the Chicago receiving department.', priority: 'Medium', status: 'Open', assignedAgent: 'Agent C', resolution: '' },
  { ticketNumber: 112, customer: 'Evergreen Paper Mills', issue: 'Wrong trailer assigned', description: 'A dry van was dispatched instead of the requested flatbed for the Tacoma pickup.', priority: 'High', status: 'Waiting on Customer', assignedAgent: 'Dispatch Lead', resolution: '' },
  { ticketNumber: 113, customer: 'Harbor Home Goods', issue: 'Short shipment inquiry', description: 'The Newark warehouse reports two cartons missing from the inbound manifest.', priority: 'Medium', status: 'Open', assignedAgent: 'Agent A', resolution: '' },
  { ticketNumber: 114, customer: 'Midwest Ag Partners', issue: 'Billing access issue', description: 'Customer cannot retrieve the invoice for its completed Des Moines load.', priority: 'Low', status: 'Resolved', assignedAgent: 'Agent B', resolution: 'Invoice link regenerated and shared with the billing contact.' }
];

async function seed() {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured.');
    await mongoose.connect(process.env.MONGODB_URI);
    await Ticket.deleteMany({});
    await Ticket.insertMany(tickets);
    console.log(`Seeded ${tickets.length} RapidDispatch tickets.`);
  } catch (error) { console.error(`Seeding failed: ${error.message}`); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
}
seed();

