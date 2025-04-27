import {expect} from '@loopback/testlab';
import {UserAdminApplication} from '../application';
import {UserRepository, GroupRepository, UserGroupRepository, RequestRepository} from '../repositories';
import {v4 as uuidv4} from 'uuid';

describe('User-Group Integration Tests', () => {
  let app: UserAdminApplication;
  let userRepo: UserRepository;
  let groupRepo: GroupRepository;
  let userGroupRepo: UserGroupRepository;
  let requestRepo: RequestRepository;

  before(async () => {
    app = new UserAdminApplication({
      rest: {
        port: 0,
      },
    });
    await app.boot();

    // Get repositories
    userRepo = await app.getRepository(UserRepository);
    groupRepo = await app.getRepository(GroupRepository);
    userGroupRepo = await app.getRepository(UserGroupRepository);
    requestRepo = await app.getRepository(RequestRepository);

    // Clean up any existing test data
    await userGroupRepo.deleteAll();
    await userRepo.deleteAll();
    await groupRepo.deleteAll();
    await requestRepo.deleteAll();
  });

  after(async () => {
    await app.stop();
  });

  describe('Isolated Tests (with cleanup)', () => {
    beforeEach(async () => {
      // Clean up test data
      await userGroupRepo.deleteAll();
      await userRepo.deleteAll();
      await groupRepo.deleteAll();
      await requestRepo.deleteAll();
    });

    it('fails to create a user without a corresponding request', async () => {
      // Attempt to create a user without a request
      const userId = uuidv4();
      const username = 'testuser';
      const now = new Date();

      await expect(
        userRepo.create({
          id: userId,
          username: username,
          displayName: 'Test User',
          responsibleParty: 'admin',
          createdAt: now,
          status: 'pending',
        })
      ).to.be.rejectedWith(
        `Cannot create user without a corresponding request. No request found for username ${username} and id ${userId}`
      );
    });

    it('creates a user with UUID and assigns to groups when request exists', async () => {
      // Create test data
      const username = 'testuser';
      const groupName = 'testgroup';
      const now = new Date();

      // Create request first
      const request = await requestRepo.create({
        username: username,
        displayName: 'Test User Request',
        email: 'testuser@example.com',
        status: 'pending',
        createdAt: now,
      });

      if (!request.id) {
        throw new Error('Request was created but no ID was generated');
      }

      // Create group
      await groupRepo.create({
        name: groupName,
        displayName: 'Test Group',
        description: 'Test group description',
        responsibleParty: 'admin',
        createdAt: now,
      });

      // Create user with UUID
      const user = await userRepo.createWithGroups(
        {
          id: request.id,
          username: username,
          displayName: 'Test User',
          responsibleParty: 'admin',
          createdAt: now,
          status: 'pending',
        },
        [groupName],
        'admin',
      );

      // Verify user was created with correct ID
      expect(user.id).to.equal(request.id);
      expect(user.username).to.equal(username);

      // Verify group assignment
      const userGroups = await userGroupRepo.find({
        where: {
          userId: request.id,
          groupName: groupName,
        },
      });
      expect(userGroups).to.have.length(1);
      expect(userGroups[0].userId).to.equal(request.id);
      expect(userGroups[0].groupName).to.equal(groupName);

      // Verify user with groups query
      const userWithGroups = await userRepo.findByIdWithGroups(request.id);
      expect(userWithGroups.groups).to.have.length(1);
      expect(userWithGroups.groups![0].name).to.equal(groupName);
    });

    it('updates user group memberships using UUID when request exists', async () => {
      // Create test data
      const username = 'testuser';
      const group1Name = 'group1';
      const group2Name = 'group2';
      const now = new Date();

      // Create request first
      const request = await requestRepo.create({
        username: username,
        displayName: 'Test User Request',
        email: 'testuser@example.com',
        status: 'pending',
        createdAt: now,
      });

      if (!request.id) {
        throw new Error('Request was created but no ID was generated');
      }

      // Create user and groups
      await userRepo.create({
        id: request.id,
        username: username,
        displayName: 'Test User',
        responsibleParty: 'admin',
        createdAt: now,
        status: 'pending',
      });

      await groupRepo.create({
        name: group1Name,
        displayName: 'Group 1',
        description: 'Test group 1',
        responsibleParty: 'admin',
        createdAt: now,
      });

      await groupRepo.create({
        name: group2Name,
        displayName: 'Group 2',
        description: 'Test group 2',
        responsibleParty: 'admin',
        createdAt: now,
      });

      // Initially assign to group1
      await userRepo.updateGroups(request.id, [group1Name], 'admin');

      // Verify initial assignment
      let userGroups = await userGroupRepo.find({where: {userId: request.id}});
      expect(userGroups).to.have.length(1);
      expect(userGroups[0].groupName).to.equal(group1Name);

      // Update to group2
      await userRepo.updateGroups(request.id, [group2Name], 'admin');

      // Verify updated assignment
      userGroups = await userGroupRepo.find({where: {userId: request.id}});
      expect(userGroups).to.have.length(1);
      expect(userGroups[0].groupName).to.equal(group2Name);
    });

    it('handles multiple group assignments for a user when request exists', async () => {
      // Create test data
      const username = 'testuser';
      const groups = ['group1', 'group2', 'group3'];
      const now = new Date();

      // Create request first
      const request = await requestRepo.create({
        username: username,
        displayName: 'Test User Request',
        email: 'testuser@example.com',
        status: 'pending',
        createdAt: now,
      });

      if (!request.id) {
        throw new Error('Request was created but no ID was generated');
      }

      // Create user
      await userRepo.create({
        id: request.id,
        username: username,
        displayName: 'Test User',
        responsibleParty: 'admin',
        createdAt: now,
        status: 'pending',
      });

      // Create groups
      for (const groupName of groups) {
        await groupRepo.create({
          name: groupName,
          displayName: `Group ${groupName}`,
          description: `Test ${groupName}`,
          responsibleParty: 'admin',
          createdAt: now,
        });
      }

      // Assign user to all groups
      await userRepo.updateGroups(request.id, groups, 'admin');

      // Verify assignments
      const userWithGroups = await userRepo.findByIdWithGroups(request.id);
      expect(userWithGroups.groups).to.have.length(3);
      const groupNames = userWithGroups.groups!.map(g => g.name);
      groups.forEach(groupName => {
        expect(groupNames).to.containEql(groupName);
      });
    });
  });

  describe('End-to-End Flow Tests (with data persistence)', () => {
    // Test data that will be shared across tests
    const username = 'flowtest';
    const groups = ['flowgroup1', 'flowgroup2'];
    const now = new Date();
    let requestId: string;

    it('step 1: creates a request that persists', async () => {
      const request = await requestRepo.create({
        username: username,
        displayName: 'Flow Test User',
        email: 'flowtest@example.com',
        status: 'pending',
        createdAt: now,
      });

      expect(request.id).to.be.ok();
      requestId = request.id!;

      // Verify request exists in database
      const foundRequest = await requestRepo.findById(requestId);
      expect(foundRequest).to.be.ok();
      expect(foundRequest.username).to.equal(username);
    });

    it('step 2: creates groups that persist', async () => {
      // Create test groups
      for (const groupName of groups) {
        await groupRepo.create({
          name: groupName,
          displayName: `Flow Test ${groupName}`,
          description: `Flow test group ${groupName}`,
          responsibleParty: 'admin',
          createdAt: now,
        });
      }

      // Verify groups exist in database
      for (const groupName of groups) {
        const foundGroup = await groupRepo.findById(groupName);
        expect(foundGroup).to.be.ok();
        expect(foundGroup.name).to.equal(groupName);
      }
    });

    it('step 3: creates a user from the request that persists', async () => {
      // Verify request still exists
      const request = await requestRepo.findById(requestId);
      expect(request).to.be.ok();

      // Create user from request
      const user = await userRepo.createWithGroups(
        {
          id: requestId,
          username: username,
          displayName: 'Flow Test User',
          responsibleParty: 'admin',
          createdAt: now,
          status: 'pending',
        },
        groups,
        'admin',
      );

      // Verify created user properties
      expect(user.id).to.equal(requestId);
      expect(user.username).to.equal(username);
      expect(user.displayName).to.equal('Flow Test User');

      // Verify user exists in database
      const foundUser = await userRepo.findById(requestId);
      expect(foundUser).to.be.ok();
      expect(foundUser.username).to.equal(username);

      // Verify user groups exist in database
      const userGroups = await userGroupRepo.find({
        where: {userId: requestId},
      });
      expect(userGroups).to.have.length(2);
      const groupNames = userGroups.map(ug => ug.groupName);
      groups.forEach(groupName => {
        expect(groupNames).to.containEql(groupName);
      });

      // Verify complete user with groups can be retrieved
      const userWithGroups = await userRepo.findByIdWithGroups(requestId);
      expect(userWithGroups.groups).to.have.length(2);
      const foundGroupNames = userWithGroups.groups!.map(g => g.name);
      groups.forEach(groupName => {
        expect(foundGroupNames).to.containEql(groupName);
      });
    });

    it('step 4: verifies all data still exists after all operations', async () => {
      // Verify request
      const request = await requestRepo.findById(requestId);
      expect(request).to.be.ok();
      expect(request.username).to.equal(username);

      // Verify user
      const user = await userRepo.findById(requestId);
      expect(user).to.be.ok();
      expect(user.username).to.equal(username);

      // Verify groups
      for (const groupName of groups) {
        const group = await groupRepo.findById(groupName);
        expect(group).to.be.ok();
        expect(group.name).to.equal(groupName);
      }

      // Verify user groups
      const userGroups = await userGroupRepo.find({
        where: {userId: requestId},
      });
      expect(userGroups).to.have.length(2);
      const groupNames = userGroups.map(ug => ug.groupName);
      groups.forEach(groupName => {
        expect(groupNames).to.containEql(groupName);
      });
    });
  });
}); 