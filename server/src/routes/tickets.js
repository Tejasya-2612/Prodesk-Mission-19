import { Router } from 'express';
import mongoose from 'mongoose';
import { Ticket } from '../models/Ticket.js';

const router = Router();
const ticketFields = ['customer', 'issue', 'description', 'priority', 'status', 'assignedAgent', 'resolution'];
const selectTicketFields = (body) => Object.fromEntries(ticketFields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
const validId = (id) => mongoose.isValidObjectId(id);

router.get('/', async (_request, response, next) => {
  try { response.json(await Ticket.find().sort({ updatedAt: -1 })); } catch (error) { next(error); }
});
router.get('/:id', async (request, response, next) => {
  try {
    if (!validId(request.params.id)) return response.status(400).json({ message: 'Invalid ticket id.' });
    const ticket = await Ticket.findById(request.params.id);
    if (!ticket) return response.status(404).json({ message: 'Ticket not found.' });
    response.json(ticket);
  } catch (error) { next(error); }
});
router.post('/', async (request, response, next) => {
  try {
    const fields = selectTicketFields(request.body);
    if (!fields.customer || !fields.issue || !fields.description) return response.status(400).json({ message: 'Customer, issue, and description are required.' });
    const newest = await Ticket.findOne().sort({ ticketNumber: -1 }).select('ticketNumber');
    const ticket = await Ticket.create({ ...fields, ticketNumber: Math.max(105, (newest?.ticketNumber || 104) + 1) });
    request.app.get('io').emit('ticket_created', ticket);
    response.status(201).json(ticket);
  } catch (error) { next(error); }
});
router.put('/:id', async (request, response, next) => {
  try {
    if (!validId(request.params.id)) return response.status(400).json({ message: 'Invalid ticket id.' });
    const ticket = await Ticket.findByIdAndUpdate(request.params.id, selectTicketFields(request.body), { new: true, runValidators: true });
    if (!ticket) return response.status(404).json({ message: 'Ticket not found.' });
    request.app.get('io').emit('ticket_updated', ticket);
    response.json(ticket);
  } catch (error) { next(error); }
});
router.delete('/:id', async (request, response, next) => {
  try {
    if (!validId(request.params.id)) return response.status(400).json({ message: 'Invalid ticket id.' });
    const ticket = await Ticket.findByIdAndDelete(request.params.id);
    if (!ticket) return response.status(404).json({ message: 'Ticket not found.' });
    response.status(204).send();
  } catch (error) { next(error); }
});

export default router;

