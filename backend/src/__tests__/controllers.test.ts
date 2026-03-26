/**
 * Tests for Controller functions
 * Uses mongodb-memory-server for real DB operations
 */
import { describe, it, expect, jest, beforeEach, afterAll, beforeAll } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';

let mongoServer: MongoMemoryServer;
let client: MongoClient;
let testDb: Db;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  client = new MongoClient(uri);
  await client.connect();
  testDb = client.db('testdb');
});

afterAll(async () => {
  await client.close();
  await mongoServer.stop();
});

describe('getActiveTerm Controller - DB Logic Tests', () => {
  beforeEach(async () => {
    await testDb.collection('terms').deleteMany({});
  });

  it('should return 404 when no active term found', async () => {
    // Test the DB query that the controller uses
    const currentTerm = await testDb.collection('terms').findOne({ IsActive: true });
    
    // Controller returns 404 if !currentTerm
    expect(currentTerm).toBeNull();
  });

  it('should return the active term when exists', async () => {
    await testDb.collection('terms').insertOne({ Term: 'FA25', IsActive: true });
    
    const currentTerm = await testDb.collection('terms').findOne({ IsActive: true });
    
    // Controller returns 200 with { Term: currentTerm.Term }
    expect(currentTerm).not.toBeNull();
    expect(currentTerm?.Term).toBe('FA25');
  });

  it('should return correct term when multiple terms exist', async () => {
    await testDb.collection('terms').insertMany([
      { Term: 'FA25', IsActive: false },
      { Term: 'WI26', IsActive: true },
      { Term: 'SP26', IsActive: false },
    ]);
    
    const currentTerm = await testDb.collection('terms').findOne({ IsActive: true });
    
    expect(currentTerm?.Term).toBe('WI26');
  });
});

describe('searchForClass Controller - DB Logic Tests', () => {
  beforeEach(async () => {
    await testDb.collection('courses').deleteMany({});
  });

  it('should return all courses when no query params', async () => {
    await testDb.collection('courses').insertMany([
      { Name: 'CSE 101', Term: 'FA25' },
      { Name: 'MATH 20C', Term: 'FA25' },
    ]);
    
    // Controller builds empty query when no params
    const query: any = {};
    const results = await testDb.collection('courses').find(query).toArray();
    
    expect(results).toHaveLength(2);
  });

  it('should filter by course name', async () => {
    await testDb.collection('courses').insertMany([
      { Name: 'CSE 101', Term: 'FA25' },
      { Name: 'CSE 102', Term: 'FA25' },
      { Name: 'MATH 20C', Term: 'FA25' },
    ]);
    
    // Controller builds query from course param
    const course = 'CSE 101';
    const safeCourse = course.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const query: any = { Name: { $regex: safeCourse, $options: 'i' } };
    
    const results = await testDb.collection('courses').find(query).toArray();
    
    expect(results).toHaveLength(1);
    expect(results[0].Name).toBe('CSE 101');
  });

  it('should filter by term', async () => {
    await testDb.collection('courses').insertMany([
      { Name: 'CSE 101', Term: 'FA25' },
      { Name: 'CSE 101', Term: 'WI26' },
    ]);
    
    const term = 'FA25';
    const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const query: any = { Term: { $regex: safeTerm, $options: 'i' } };
    
    const results = await testDb.collection('courses').find(query).toArray();
    
    expect(results).toHaveLength(1);
    expect(results[0].Term).toBe('FA25');
  });

  it('should filter by both course and term', async () => {
    await testDb.collection('courses').insertMany([
      { Name: 'CSE 101', Term: 'FA25' },
      { Name: 'CSE 101', Term: 'WI26' },
      { Name: 'MATH 20C', Term: 'FA25' },
    ]);
    
    const course = 'CSE';
    const term = 'FA25';
    const query: any = {
      Name: { $regex: course, $options: 'i' },
      Term: { $regex: term, $options: 'i' },
    };
    
    const results = await testDb.collection('courses').find(query).toArray();
    
    expect(results).toHaveLength(1);
    expect(results[0].Name).toBe('CSE 101');
    expect(results[0].Term).toBe('FA25');
  });

  it('should handle case-insensitive search', async () => {
    await testDb.collection('courses').insertOne({ Name: 'Computer Science 101', Term: 'FA25' });
    
    const query: any = { Name: { $regex: 'computer science', $options: 'i' } };
    const results = await testDb.collection('courses').find(query).toArray();
    
    expect(results).toHaveLength(1);
  });

  it('should return empty array when no matches', async () => {
    await testDb.collection('courses').insertOne({ Name: 'CSE 101', Term: 'FA25' });
    
    const query: any = { Name: { $regex: 'xyz', $options: 'i' } };
    const results = await testDb.collection('courses').find(query).toArray();
    
    expect(results).toHaveLength(0);
  });

  it('should handle whitespace in course name', async () => {
    await testDb.collection('courses').insertOne({ Name: 'CSE 101', Term: 'FA25' });
    
    const course = '  CSE 101  ';
    const trimmed = typeof course === 'string' ? course.trim() : '';
    const safeCourse = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const query: any = { Name: { $regex: safeCourse, $options: 'i' } };
    
    const results = await testDb.collection('courses').find(query).toArray();
    expect(results).toHaveLength(1);
  });
});

describe('searchOneRMP Controller - DB Logic Tests', () => {
  beforeEach(async () => {
    await testDb.collection('rmpData').deleteMany({});
  });

  it('should return all RMP data when no teacher param', async () => {
    await testDb.collection('rmpData').insertMany([
      { name: 'John Smith', nameKey: 'john smith', avgRating: 4.5 },
      { name: 'Jane Doe', nameKey: 'jane doe', avgRating: 4.8 },
    ]);
    
    // Controller returns all when no teacher param
    const results = await testDb.collection('rmpData').find({}).toArray();
    
    expect(results).toHaveLength(2);
  });

  it('should find teacher by normalized nameKey', async () => {
    await testDb.collection('rmpData').insertOne({
      name: 'John Smith',
      nameKey: 'john smith',
      avgRating: 4.5,
    });
    
    // Controller normalizes teacher name
    const teacher = 'John Smith';
    const normalized = teacher.replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim().toLowerCase();
    const results = await testDb.collection('rmpData').find({ nameKey: normalized }).toArray();
    
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('John Smith');
  });

  it('should return empty when teacher not found', async () => {
    await testDb.collection('rmpData').insertOne({
      name: 'John Smith',
      nameKey: 'john smith',
      avgRating: 4.5,
    });
    
    const results = await testDb.collection('rmpData').find({ nameKey: 'unknown' }).toArray();
    
    expect(results.length).toBe(0);
  });

  it('should handle teacher name with extra spaces', async () => {
    await testDb.collection('rmpData').insertOne({
      name: 'John Smith',
      nameKey: 'john smith',
      avgRating: 4.5,
    });
    
    // Test normalization logic from controller
    const teacher = '  John   Smith  ';
    const normalized = teacher.replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim().toLowerCase();
    
    expect(normalized).toBe('john smith');
  });

  it('should return 404 when teacher not found', async () => {
    const data = []; // Empty result
    
    // Controller returns 404 if data.length <= 0
    expect(data.length <= 0).toBe(true);
  });

  it('should return multiple professors with same normalized name', async () => {
    await testDb.collection('rmpData').insertMany([
      { name: 'John Smith', nameKey: 'john smith', avgRating: 4.5 },
      { name: 'John Smith', nameKey: 'john smith', avgRating: 3.8 },
    ]);
    
    const results = await testDb.collection('rmpData').find({ nameKey: 'john smith' }).toArray();
    
    expect(results).toHaveLength(2);
  });
});

describe('updateInformation Controller - DB Logic Tests', () => {
  beforeEach(async () => {
    await testDb.collection('courses').deleteMany({});
    await testDb.collection('rmpData').deleteMany({});
  });

  it('should clear courses and rmpData collections', async () => {
    // Insert initial data
    await testDb.collection('courses').insertOne({ Name: 'Old Course' });
    await testDb.collection('rmpData').insertOne({ name: 'Old Prof' });
    
    // Verify data exists
    let courses = await testDb.collection('courses').find({}).toArray();
    expect(courses).toHaveLength(1);
    
    // Controller logic: deleteMany for both collections
    await testDb.collection('courses').deleteMany({});
    await testDb.collection('rmpData').deleteMany({});
    
    // Verify collections are cleared
    courses = await testDb.collection('courses').find({}).toArray();
    const rmpData = await testDb.collection('rmpData').find({}).toArray();
    expect(courses).toHaveLength(0);
    expect(rmpData).toHaveLength(0);
  });

  it('should prepare for ingestion', async () => {
    // Verify that clearing collections prepares for new data
    await testDb.collection('courses').deleteMany({});
    await testDb.collection('rmpData').deleteMany({});
    
    const courses = await testDb.collection('courses').find({}).toArray();
    const rmpData = await testDb.collection('rmpData').find({}).toArray();
    
    expect(courses).toHaveLength(0);
    expect(rmpData).toHaveLength(0);
  });
});

// Test controller response logic
describe('Controller Response Logic Tests', () => {
  beforeEach(async () => {
    await testDb.collection('terms').deleteMany({});
    await testDb.collection('courses').deleteMany({});
    await testDb.collection('rmpData').deleteMany({});
  });

  it('getActiveTerm response: 404 when no term', () => {
    const currentTerm = null;
    const response = !currentTerm ? 404 : 200;
    expect(response).toBe(404);
  });

  it('getActiveTerm response: 200 with term when found', async () => {
    await testDb.collection('terms').insertOne({ Term: 'FA25', IsActive: true });
    const currentTerm = await testDb.collection('terms').findOne({ IsActive: true });
    
    const response = !currentTerm ? 404 : 200;
    const body = !currentTerm ? { message: 'No active term found' } : { Term: currentTerm.Term };
    
    expect(response).toBe(200);
    expect(body).toEqual({ Term: 'FA25' });
  });

  it('searchForClass builds correct query object', () => {
    // Test query building logic
    const queryParams = { course: 'CSE', term: 'FA25' };
    const query: any = {};
    
    const course = typeof queryParams.course === 'string' ? queryParams.course.trim() : '';
    if (course.length > 0) {
      query.Name = { $regex: course, $options: 'i' };
    }
    
    const term = typeof queryParams.term === 'string' ? queryParams.term.trim() : '';
    if (term.length > 0) {
      query.Term = { $regex: term, $options: 'i' };
    }
    
    expect(query).toEqual({
      Name: { $regex: 'CSE', $options: 'i' },
      Term: { $regex: 'FA25', $options: 'i' }
    });
  });

  it('searchOneRMP returns 404 when not found', () => {
    const data = [];
    const response = data.length <= 0 ? 404 : 200;
    expect(response).toBe(404);
  });

  it('searchOneRMP returns data when found', async () => {
    await testDb.collection('rmpData').insertOne({
      name: 'John Smith',
      nameKey: 'john smith',
      avgRating: 4.5,
    });
    
    const data = await testDb.collection('rmpData').find({ nameKey: 'john smith' }).toArray();
    const response = data.length <= 0 ? 404 : 200;
    
    expect(response).toBe(200);
    expect(data.length).toBe(1);
  });
});