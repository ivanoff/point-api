# @point/api

## Instalation

1. Generate htpasswd and add it to `/opt/verdaccio/config/htpasswd` on `point.study` server or send to someone who has access.

  - `htpasswd -n <USERNAME>`

2. Login on private npm service

  - `npm config set @point:registry=https://npm.point.study`
  - `npm login --registry https://npm.point.study`

3. Install module

  - `npm i -S @point/api`

## Usage Examples

```typescript
import { ApiClient } api from '@point/api';

const client = new ApiClient({ url: 'https://api.dev.point.study' });

const { data: users } = await client.getUsers({ _limit: 2 });

console.log(users);
```

## API

### Users

#### Register

`curl https://api.dev.point.study/register -H 'Content-Type: application/json' -d '{"login": "test", "password": "12345", "email": "2@ivanoff.org.ua", "firstName": "Test", "secondName": "Testing"}'`

```json
{
    "id": 1,
    "login": "test",
    "statuses": ["unconfirmed"],
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibG9naW4iOiJ0ZXN0Iiwic3RhdHVzIjoidW5jb25maXJtZWQiLCJmaXJzdF9uYW1lIjoiVGVzdCIsImlhdCI6MTY1ODQyNzc4OSwiZXhwIjoxNjU4NDMxMzg5fQ.TfurQln1Qf98_vy-wRqIKIxPTttzDCbp0CIaMsoqPb8",
    "firstName": "Test",
    "secondName": "Testing",
    "email": "2@ivanoff.org.ua",
    "options": {
        "email": {
            "on": true
        }
    },
    "refresh": "8e942d46-cc12-4f53-9503-1ce3529ab889"
}
```

Mail with code

![register password email](static/reset_password_1.png)

#### Confirm email by code

`curl https://api.dev.point.study/register/check -H 'Content-Type: application/json' -d '{"email": "2@ivanoff.org.ua", "code": "98c4fe86-3244-4381-82b7-a239fefabbfd"}'`

```json
{
    "id": 1,
    "login": "test",
    "statuses": ["registered"],
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibG9naW4iOiJ0ZXN0Iiwic3RhdHVzIjoicmVnaXN0ZXJlZCIsImZpcnN0X25hbWUiOiJUZXN0IiwiaWF0IjoxNjU4NDI3OTQzLCJleHAiOjE2NTg0MzE1NDN9.2jftgg4vOEGvSFIPSG6BOnAU1i3uVpuzaXexBPvTFOw",
    "firstName": "Test",
    "secondName": "Testing",
    "email": "2@ivanoff.org.ua",
    "options": {
        "email": {
            "on": true
        }
    },
    "refresh": "549d7976-9a3f-4b55-8d52-4df1a9c27dc8"
}
```

#### Get token

`curl https://api.dev.point.study/login -H 'Content-Type: application/json' -d '{"login": "test", "password": "12345"}'`

```json
{
    "id": 1,
    "login": "test",
    "statuses": ["registered"],
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibG9naW4iOiJ0ZXN0Iiwic3RhdHVzIjoicmVnaXN0ZXJlZCIsImZpcnN0X25hbWUiOiJUZXN0IiwiaWF0IjoxNjU4NDI4MDkzLCJleHAiOjE2NTg0MzE2OTN9.8LIJqLLvQ-8DcQJ7bi9Btkf1Hxbxiv-lqAv6GqfT_RQ",
    "firstName": "Test",
    "secondName": "Testing",
    "email": "2@ivanoff.org.ua",
    "options": {
        "email": {
            "on": true
        }
    },
    "refresh": "032a4782-9ecc-463d-b2f6-5f33d6672c95",
    "cookies": false
}
```

#### Utilize External Services (e.g., Google)

1. Navigate to `https://api.dev.point.study/battlepro/login/google` to grant access to your data.

2. Upon granting access, the callback URL will resemble:  `https://api.dev.point.study/battlepro/login/google?code=__code_&scope=_scope_....`

3. Send a `POST` request to `https://api.dev.point.study/battlepro/login/google` including a body constructed from the query parameters: `{"code":"_code_","scope":"_scope_",....}`

4. You'll receive token for `battlepro` and a `refresh token`.

5. Utilize the `refresh token` to acquire tokens for any server by sending a `POST` request to `https://api.dev.point.study/{serverSlug}/login` with the body `{"refresh": "refresh token"}'`

#### Change password

You don't need to send `password` if `time_password_changed` is null.

`curl https://api.dev.point.study/users/1/settings/password -X PATCH -H 'Content-Type: application/json' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibG9naW4iOiJ0ZXN0Iiwic3RhdHVzIjoicmVnaXN0ZXJlZCIsImZpcnN0X25hbWUiOiJUZXN0IiwiaWF0IjoxNjU4NDI4MDkzLCJleHAiOjE2NTg0MzE2OTN9.8LIJqLLvQ-8DcQJ7bi9Btkf1Hxbxiv-lqAv6GqfT_RQ' -d '{"password": "12345", "newPassword": "1234"}'`

```json
{
    "ok": 1
}
```

After password changed, `time_password_changed` field should be updated to current time

#### Wrong password example

`curl https://api.dev.point.study/login -H 'Content-Type: application/json' -d '{"login": "test", "password": "12345"}'`

```json
{
    "code": 1030,
    "name": "User Not Found",
    "description": "User not found. Please send correct login and password"
}
```

#### Get user details

`curl https://api.dev.point.study/users/1 -H 'Content-Type: application/json' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibG9naW4iOiJ0ZXN0Iiwic3RhdHVzIjoicmVnaXN0ZXJlZCIsImZpcnN0X25hbWUiOiJUZXN0IiwiaWF0IjoxNjU4NDI4MDkzLCJleHAiOjE2NTg0MzE2OTN9.8LIJqLLvQ-8DcQJ7bi9Btkf1Hxbxiv-lqAv6GqfT_RQ'`

```json
{
    "id": 1,
    "login": null,
    "password": null,
    "salt": null,
    "refresh": null,
    "statuses": [null],
    "firstName": "Test",
    "secondName": "Testing",
    "email": "2@ivanoff.org.ua",
    "options": {
        "email": {
            "on": true
        }
    },
    "deleted": false,
    "phone": null,
    "company_name": null,
    "company_id": null,
    "company_country": null,
    "company_city": null,
    "company_address": null,
    "company_phone": null,
    "company_website": null,
    "cookies": false,
    "lang": null,
    "subscription": null
}
```

#### Get current user info

`curl https://api.dev.point.study/users/me -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibG9naW4iOiJ0ZXN0Iiwic3RhdHVzIjoicmVnaXN0ZXJlZCIsImZpcnN0X25hbWUiOiJUZXN0IiwiaWF0IjoxNjU4NDI4MDkzLCJleHAiOjE2NTg0MzE2OTN9.8LIJqLLvQ-8DcQJ7bi9Btkf1Hxbxiv-lqAv6GqfT_RQ'`

```javascript
{
  id: 7,
  login: 'aaa5',
  statuses: [ 'registered' ],
  firstName: 'John'
}
```

#### Update user info

`curl https://api.dev.point.study/users/1 -X PUT -H 'Content-Type: application/json' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibG9naW4iOiJ0ZXN0Iiwic3RhdHVzIjoicmVnaXN0ZXJlZCIsImZpcnN0X25hbWUiOiJUZXN0IiwiaWF0IjoxNjU4NDI4MDkzLCJleHAiOjE2NTg0MzE2OTN9.8LIJqLLvQ-8DcQJ7bi9Btkf1Hxbxiv-lqAv6GqfT_RQ' -d '{"firstName": "Test2", "secondName": "Testing2", "phone": "991029384953"}'`

```json
{
    "id": 1,
    "login": "test",
    "password": "5c3782114928fe36979e92406ba384f531807b547ca138d518191c9390fb18ff",
    "salt": "95a6ad59-188f-47db-9430-7b358756dd10",
    "refresh": "6c2d7068-c511-47fe-9b0f-ae3d212f4bb9",
    "statuses": ["registered"],
    "firstName": "Test2",
    "secondName": "Testing2",
    "options": {
        "email": {
            "on": true
        }
    },
    "deleted": false,
    "phone": "991029384953",
    "company_name": null,
    "company_id": null,
    "company_country": null,
    "company_city": null,
    "company_address": null,
    "company_phone": null,
    "company_website": null,
    "cookies": false,
    "lang": null
}
```

#### Expired Token Example

`curl https://api.dev.point.study/users/1/settings -H 'Content-Type: application/json' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibG9naW4iOiJ0ZXN0Iiwic3RhdHVzIjoicmVnaXN0ZXJlZCIsImZpcnN0X25hbWUiOiJUZXN0IiwiaWF0IjoxNjU4NDI4MDkzLCJleHAiOjE2NTg0MzE2OTN9.8LIJqLLvQ-8DcQJ7bi9Btkf1Hxbxiv-lqAv6GqfT_RQ'`

```json
{
    "code": 103,
    "statuses": [403],
    "name": "Token expired",
    "description": "Token has been expired. Please get valid token from /login"
}
```

#### Refresh token

`curl https://api.dev.point.study/login -H 'Content-Type: application/json' -d '{"refresh": "032a4782-9ecc-463d-b2f6-5f33d6672c95"}'`

```json
{
    "id": 1,
    "login": "test",
    "statuses": ["registered"],
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibG9naW4iOiJ0ZXN0Iiwic3RhdHVzIjoicmVnaXN0ZXJlZCIsImZpcnN0X25hbWUiOiJUZXN0MiIsImlhdCI6MTY1ODQzMDkwMiwiZXhwIjoxNjU4NDM0NTAyfQ.Gc3rgldHUY9XdsNKvmxaTINiTVXzD6OYFc6ObFPRqFI",
    "firstName": "Test2",
    "secondName": "Testing2",
    "email": "2@ivanoff.org.ua",
    "options": {
        "email": {
            "on": true
        }
    },
    "refresh": "bb35c4c0-d2a3-4c35-889a-9023b0f41b33",
    "cookies": false
}
```

#### Change e-mail

`curl https://api.dev.point.study/login -X PATCH -H 'Content-Type: application/json' -d '{"email": "test@email.com"}' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibG9naW4iOiJ0ZXN0Iiwic3RhdHVzIjoicmVnaXN0ZXJlZCIsImZpcnN0X25hbWUiOiJUZXN0IiwiaWF0IjoxNjU4NDI4MDkzLCJleHAiOjE2NTg0MzE2OTN9.8LIJqLLvQ-8DcQJ7bi9Btkf1Hxbxiv-lqAv6GqfT_RQ'`

```json
{
    "ok": 1
}
```

##### Set new email by restore code

`curl https://api.dev.point.study/login/email -H 'Content-Type: application/json' -d '{"code": "2f3d0c98-e750-49e8-9795-d19d346dede5"}'`

```json
{
    "ok": 1
}
```

#### Get token to restore password

`curl https://api.dev.point.study/login/forgot -H 'Content-Type: application/json' -d '{"login": "test"}'`

```json
{
    "ok": 1
}
```

#### Set new password by restore code

`curl https://api.dev.point.study/login/restore -H 'Content-Type: application/json' -d '{"code": "2f3d0c98-e750-49e8-9795-d19d346dede5", "password": "12345"}'`

```json
{
    "ok": 1
}
```
#### Getting root

root has `root` password by dafault, so change it asap

`curl https://api.dev.point.study/login -H 'Content-Type: application/json' -d '{"login": "root", "password": "root"}'`

```json
{
    "id": -1,
    "login": "root",
    "statuses": ["root"],
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6LTEsImxvZ2luIjoicm9vdCIsInN0YXR1cyI6InJvb3QiLCJmaXJzdF9uYW1lIjpudWxsLCJpYXQiOjE2NTg0ODQzODUsImV4cCI6MTY1ODQ4Nzk4NX0.M4DamkmcoWYwpQuMHOhcVv1NqESXogJG0TTF425m5tI",
    "firstName": null,
    "secondName": null,
    "email": null,
    "options": null,
    "refresh": "62d073c9-ec4c-4a64-af6c-ae19ffab6695",
    "cookies": false
}
```

`curl https://api.dev.point.study/users/-1/settings/password -X PATCH -H 'Content-Type: application/json' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6LTEsImxvZ2luIjoicm9vdCIsInN0YXR1cyI6InJvb3QiLCJmaXJzdF9uYW1lIjpudWxsLCJpYXQiOjE2NTg0ODQ2MDcsImV4cCI6MTY1ODQ4ODIwN30.ObjE9RT9_GG_ioecLfq45YRebC_K4Hj8icpHhMEQrOc' -d '{"current_password": "root", "password": "12345"}'`

#### Updating user by root

`curl https://api.dev.point.study/admin/users/1 -X PATCH -H 'Content-Type: application/json' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6LTEsImxvZ2luIjoicm9vdCIsInN0YXR1cyI6InJvb3QiLCJmaXJzdF9uYW1lIjpudWxsLCJpYXQiOjE2NTg0ODQ2NDksImV4cCI6MTY1ODQ4ODI0OX0.Mq8VF3tSzQ4u9c9dXyHV0wJN0ZFTtnZZNHf280wHoEA' -d '{"firstName": "Test33", "secondName": "Testing33", "phone": "333333333333"}'`

```json
[
    {
        "id": 1
    }
]
```

`curl https://api.dev.point.study/users/1`

```json
{
    "id": 1,
    "login": null,
    "password": null,
    "salt": null,
    "refresh": null,
    "statuses": [null],
    "firstName": "Test33",
    "secondName": "Testing33",
    "email": "2@ivanoff.org.ua",
    "options": {
        "email": {
            "on": true
        }
    },
    "deleted": false,
    "phone": "333333333333",
    "company_name": null,
    "company_id": null,
    "company_country": null,
    "company_city": null,
    "company_address": null,
    "company_phone": null,
    "company_website": null,
    "cookies": false,
    "lang": null,
    "subscription": null
}
```

#### Superadmin

##### Login as other user

`GET /superadmin/tokens/:user_id` `Authorization: Bearer superadmin_token`

##### Logout back to superadmin

`DELETE /superadmin/tokens` `Authorization: user_token`

## Filters

### Filter course example

`curl https://api.dev.point.study/courses?course_type_id=3`

```json
{
    "total": 1,
    "data": [
        {
            "id": 5,
            "time_created": "2023-07-21T19:55:28.043Z",
            "time_updated": null,
            "deleted": false,
            "user_id": 1,
            "course_type_id": 3,
            "name": "Course X",
        }
    ]
}
```

### Get id and name, second page, 2 records per page, order by id desc

`curl 'https://api.dev.point.study/courses?_fields=id,name&_page=2&_limit=2&_sort=-id'`

```json
{
    "total": 5,
    "data": [
        {
            "id": 3,
            "name": "Course X"
        },
        {
            "id": 2,
            "name": "Course Y"
        }
    ]
}
```

### Search by multiply ids

`curl 'https://api.dev.point.study/courses?_fields=id,name&id=1&id=4'`

```json
{
    "total": 2,
    "data": [
        {
            "id": 1,
            "name": "Course X"
        },
        {
            "id": 4,
            "name": "Course X"
        }
    ]
}
```

### Search where not value

`curl 'https://api.dev.point.study/courses?_fields=name&name!=Course`

### Search by ilike

`curl 'https://api.dev.point.study/courses?_fields=name&name~=%25our%25'`

```json
{
    "total": 5,
    "data": [
        {
            "name": "Course X"
        },
        {
            "name": "Course X"
        },
        {
            "name": "Course X"
        },
        {
            "name": "Course X"
        },
        {
            "name": "Course X"
        }
    ]
}
```

### From-to search

`curl 'https://api.dev.point.study/courses?_fields=id,name&_from_id=2&_to_id=4'`

```json
{
    "total": 3,
    "data": [
        {
            "id": 2,
            "name": "Course X"
        },
        {
            "id": 3,
            "name": "Course X"
        },
        {
            "id": 4,
            "name": "Course X"
        }
    ]
}
```