#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Scalable Web App
Tests authentication, task CRUD operations, JWT security, and error handling
"""

import requests
import sys
import time
from datetime import datetime
from typing import Dict, Any

class BackendAPITester:
    def __init__(self, base_url: str = "https://taskflowpro-backend.onrender.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_tasks = []

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED")
        else:
            print(f"❌ {name}: FAILED - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        })

    def make_request(self, method: str, endpoint: str, data: Dict| None = None, expected_status: int = 200, use_auth: bool = False) -> tuple[bool, Dict]:
        """Make HTTP request and validate response"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if use_auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except ValueError:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test basic API health"""
        print("\n🔍 Testing API Health Check...")
        success, response = self.make_request('GET', '')
        self.log_test("API Health Check", success, 
                     "" if success else f"API not responding: {response}")
        return success

    def test_user_signup(self, email: str, name: str, password: str):
        """Test user registration"""
        print(f"\n🔍 Testing User Signup for {email}...")
        
        data = {
            "email": email,
            "name": name,
            "password": password
        }
        
        success, response = self.make_request('POST', 'auth/signup', data, 200)
        
        if success:
            if 'access_token' in response and 'user' in response:
                self.token = response['access_token']
                self.user_id = response['user']['id']
                self.log_test("User Signup", True, f"User created with ID: {self.user_id}")
                return True
            else:
                self.log_test("User Signup", False, "Missing token or user data in response")
                return False
        else:
            self.log_test("User Signup", False, f"Signup failed: {response}")
            return False

    def test_duplicate_signup(self, email: str, name: str, password: str):
        """Test duplicate email registration"""
        print("\n🔍 Testing Duplicate Email Signup...")

        
        data = {
            "email": email,
            "name": name,
            "password": password
        }
        
        success, response = self.make_request('POST', 'auth/signup', data, 400)
        self.log_test("Duplicate Email Prevention", success, 
                     "Correctly rejected duplicate email" if success else f"Should have rejected duplicate: {response}")

    def test_user_login(self, email: str, password: str):
        """Test user login"""
        print(f"\n🔍 Testing User Login for {email}...")
        
        data = {
            "email": email,
            "password": password
        }
        
        success, response = self.make_request('POST', 'auth/login', data, 200)
        
        if success:
            if 'access_token' in response and 'user' in response:
                self.token = response['access_token']
                self.user_id = response['user']['id']
                self.log_test("User Login", True, f"Login successful for user: {self.user_id}")
                return True
            else:
                self.log_test("User Login", False, "Missing token or user data in response")
                return False
        else:
            self.log_test("User Login", False, f"Login failed: {response}")
            return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        print("\n🔍 Testing Invalid Login Credentials...")
        
        data = {
            "email": "invalid@example.com",
            "password": "wrongpassword"
        }
        
        success, response = self.make_request('POST', 'auth/login', data, 401)
        self.log_test("Invalid Login Prevention", success,
                     "Correctly rejected invalid credentials" if success else f"Should have rejected invalid login: {response}")

    def test_get_profile(self):
        """Test getting user profile"""
        print("\n🔍 Testing Get User Profile...")
        
        success, response = self.make_request('GET', 'auth/profile', use_auth=True)
        
        if success:
            if 'id' in response and 'email' in response and 'name' in response:
                self.log_test("Get User Profile", True, f"Profile retrieved for user: {response['name']}")
                return True
            else:
                self.log_test("Get User Profile", False, "Missing required profile fields")
                return False
        else:
            self.log_test("Get User Profile", False, f"Profile retrieval failed: {response}")
            return False

    def test_unauthorized_access(self):
        """Test accessing protected routes without token"""
        print("\n🔍 Testing Unauthorized Access...")
        
        # Temporarily remove token
        old_token = self.token
        self.token = None
        
        success, response = self.make_request('GET', 'auth/profile', expected_status=401, use_auth=False)
        self.log_test("Unauthorized Access Prevention", success,
                     "Correctly rejected unauthorized access" if success else f"Should have rejected unauthorized access: {response}")
        
        # Restore token
        self.token = old_token

    def test_create_task(self, title: str, description: str = "", completed: bool = False):
        """Test creating a task"""
        print(f"\n🔍 Testing Create Task: {title}...")
        
        data = {
            "title": title,
            "description": description,
            "completed": completed
        }
        
        success, response = self.make_request('POST', 'tasks', data, 200, use_auth=True)
        
        if success:
            if 'id' in response and 'title' in response and 'user_id' in response:
                task_id = response['id']
                self.created_tasks.append(task_id)
                self.log_test("Create Task", True, f"Task created with ID: {task_id}")
                return task_id
            else:
                self.log_test("Create Task", False, "Missing required task fields in response")
                return None
        else:
            self.log_test("Create Task", False, f"Task creation failed: {response}")
            return None

    def test_get_tasks(self):
        """Test getting all tasks"""
        print("\n🔍 Testing Get All Tasks...")
        
        success, response = self.make_request('GET', 'tasks', use_auth=True)
        
        if success:
            if isinstance(response, list):
                self.log_test("Get All Tasks", True, f"Retrieved {len(response)} tasks")
                return response
            else:
                self.log_test("Get All Tasks", False, "Response is not a list")
                return []
        else:
            self.log_test("Get All Tasks", False, f"Failed to get tasks: {response}")
            return []

    def test_get_task_by_id(self, task_id: str):
        """Test getting a specific task"""
        print(f"\n🔍 Testing Get Task by ID: {task_id}...")
        
        success, response = self.make_request('GET', f'tasks/{task_id}', use_auth=True)
        
        if success:
            if 'id' in response and response['id'] == task_id:
                self.log_test("Get Task by ID", True, f"Retrieved task: {response['title']}")
                return response
            else:
                self.log_test("Get Task by ID", False, "Task ID mismatch or missing fields")
                return None
        else:
            self.log_test("Get Task by ID", False, f"Failed to get task: {response}")
            return None

    def test_update_task(self, task_id: str, updates: Dict):
        """Test updating a task"""
        print(f"\n🔍 Testing Update Task: {task_id}...")
        
        success, response = self.make_request('PUT', f'tasks/{task_id}', updates, 200, use_auth=True)
        
        if success:
            if 'id' in response and response['id'] == task_id:
                self.log_test("Update Task", True, "Task updated successfully")
                return response
            else:
                self.log_test("Update Task", False, "Task ID mismatch or missing fields")
                return None
        else:
            self.log_test("Update Task", False, f"Failed to update task: {response}")
            return None

    def test_delete_task(self, task_id: str):
        """Test deleting a task"""
        print(f"\n🔍 Testing Delete Task: {task_id}...")
        
        success, response = self.make_request('DELETE', f'tasks/{task_id}', expected_status=200, use_auth=True)
        
        if success:
            self.log_test("Delete Task", True, "Task deleted successfully")
            if task_id in self.created_tasks:
                self.created_tasks.remove(task_id)
            return True
        else:
            self.log_test("Delete Task", False, f"Failed to delete task: {response}")
            return False

    def test_search_tasks(self, search_term: str):
        """Test task search functionality"""
        print(f"\n🔍 Testing Task Search: '{search_term}'...")
        
        success, response = self.make_request('GET', f'tasks?search={search_term}', use_auth=True)
        
        if success:
            if isinstance(response, list):
                self.log_test("Task Search", True, f"Search returned {len(response)} results")
                return response
            else:
                self.log_test("Task Search", False, "Search response is not a list")
                return []
        else:
            self.log_test("Task Search", False, f"Search failed: {response}")
            return []

    def test_filter_tasks(self, completed: bool):
        """Test task filtering functionality"""
        print(f"\n🔍 Testing Task Filter: completed={completed}...")
        
        success, response = self.make_request('GET', f'tasks?completed={str(completed).lower()}', use_auth=True)
        
        if success:
            if isinstance(response, list):
                # Verify all tasks match the filter
                all_match = all(task['completed'] == completed for task in response)
                self.log_test("Task Filter", all_match, 
                             f"Filter returned {len(response)} tasks, all matching filter" if all_match 
                             else "Some tasks don't match the filter criteria")
                return response
            else:
                self.log_test("Task Filter", False, "Filter response is not a list")
                return []
        else:
            self.log_test("Task Filter", False, f"Filter failed: {response}")
            return []

    def test_jwt_token_validation(self):
        """Test JWT token validation with invalid token"""
        print("\n🔍 Testing JWT Token Validation...")
        
        # Save current token
        old_token = self.token
        
        # Use invalid token
        self.token = "invalid.jwt.token"
        
        success, response = self.make_request('GET', 'auth/profile', expected_status=401, use_auth=True)
        self.log_test("JWT Token Validation", success,
                     "Correctly rejected invalid JWT token" if success else f"Should have rejected invalid token: {response}")
        
        # Restore valid token
        self.token = old_token

    def cleanup_created_tasks(self):
        """Clean up any remaining test tasks"""
        print("\n🧹 Cleaning up test tasks...")
        for task_id in self.created_tasks.copy():
            self.test_delete_task(task_id)

    def run_comprehensive_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Comprehensive Backend API Testing...")
        print(f"Testing API at: {self.api_url}")
        
        # Generate unique test data
        timestamp = int(time.time())
        test_email = f"test_user_{timestamp}@example.com"
        test_name = f"Test User {timestamp}"
        test_password = "TestPassword123!"
        
        try:
            # 1. Health Check
            if not self.test_health_check():
                print("❌ API is not responding. Stopping tests.")
                return False
            
            # 2. Authentication Tests
            if not self.test_user_signup(test_email, test_name, test_password):
                print("❌ User signup failed. Stopping tests.")
                return False
            
            # Test duplicate signup
            self.test_duplicate_signup(test_email, test_name, test_password)
            
            # Test login
            if not self.test_user_login(test_email, test_password):
                print("❌ User login failed. Stopping tests.")
                return False
            
            # Test invalid login
            self.test_invalid_login()
            
            # Test profile retrieval
            if not self.test_get_profile():
                print("❌ Profile retrieval failed. Stopping tests.")
                return False
            
            # Test unauthorized access
            self.test_unauthorized_access()
            
            # Test JWT validation
            self.test_jwt_token_validation()
            
            # 3. Task CRUD Tests
            # Create test tasks
            task1_id = self.test_create_task("Test Task 1", "This is a test task for testing", False)
            
            if not task1_id:
                print("❌ Task creation failed. Stopping task tests.")
                return False
            
            # Get specific task
            self.test_get_task_by_id(task1_id)
            
            # Update task
            if task1_id:
                self.test_update_task(task1_id, {
                    "title": "Updated Test Task 1",
                    "description": "This task has been updated",
                    "completed": True
                })
            
            # 4. Search and Filter Tests
            self.test_search_tasks("test")
            self.test_search_tasks("search")
            self.test_filter_tasks(True)
            self.test_filter_tasks(False)
            
            # 5. Cleanup
            self.cleanup_created_tasks()
            
            return True
            
        except Exception as e:
            print(f"❌ Unexpected error during testing: {str(e)}")
            return False

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("📊 BACKEND API TEST SUMMARY")
        print("="*60)
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.tests_run - self.tests_passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['name']}: {result['details']}")
        
        print("\n✅ PASSED TESTS:")
        for result in self.test_results:
            if result['success']:
                print(f"  • {result['name']}")

def main():
    """Main test execution"""
    tester = BackendAPITester()
    
    try:
        success = tester.run_comprehensive_tests()
        tester.print_summary()
        
        # Return appropriate exit code
        return 0 if success and tester.tests_passed == tester.tests_run else 1
        
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
